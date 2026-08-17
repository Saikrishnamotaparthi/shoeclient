import { adminDb } from '../../config/firebase';
import { ShippingProvider } from './types';
import { DelhiveryProvider } from './delhiveryProvider';
import { ShadowfaxProvider } from './shadowfaxProvider';
import { Order, Shipment, ShippingSettings } from '../../types';
import { notificationService } from '../notification';

class ShippingService {
  public providers: Map<string, ShippingProvider>;

  constructor() {
    this.providers = new Map();
    this.providers.set('DELHIVERY', new DelhiveryProvider());
    this.providers.set('SHADOWFAX', new ShadowfaxProvider());
  }

  private async getSettings(): Promise<ShippingSettings> {
    const doc = await adminDb.collection('settings').doc('shipping').get();
    const storeDoc = await adminDb.collection('settings').doc('store').get();
    const storeData = storeDoc.exists ? storeDoc.data() : {};

    const baseSettings = doc.exists ? (doc.data() as ShippingSettings) : {
      defaultProvider: 'SHIPROCKET' as const,
      automaticShipmentEnabled: true,
      freeShippingThreshold: 500,
      defaultShippingFee: 50,
      defaultPackageWeight: 0.5,
      defaultPackageDimensions: { length: 10, breadth: 10, height: 10 },
      pickupAddress: {
        name: 'DOT FREELANCER B2C',
        phone: '9999999999',
        address: '123 Sneaker Street',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
        country: 'India'
      }
    };

    if (storeData?.warehousePincode) {
      baseSettings.pickupAddress = {
        ...baseSettings.pickupAddress,
        pincode: storeData.warehousePincode,
        ...(storeData.warehouseAddress ? { address: storeData.warehouseAddress } : {})
      };
    }

    return baseSettings;
  }

  async processPendingShipment(orderId: string): Promise<void> {
    const orderDoc = await adminDb.collection('orders').doc(orderId).get();
    if (!orderDoc.exists) return;

    const order = { id: orderDoc.id, ...orderDoc.data() } as Order;
    
    // Only process orders that are ready to be shipped
    if (order.status === 'CANCELLED' || order.status === 'DELIVERED') {
      return;
    }

    const settings = await this.getSettings();
    if (!settings.automaticShipmentEnabled) {
      return;
    }

    try {
      await this.createShipment(order, settings);
    } catch (error) {
      console.error(`Failed to automatically process shipment for order ${orderId}:`, error);
      // We don't fail the order, we just mark shipmentStatus as FAILED for manual retry
      await adminDb.collection('orders').doc(orderId).update({
        shipmentStatus: 'FAILED',
        updatedAt: new Date().toISOString()
      });
    }
  }

  async createShipment(order: Order, overrideSettings?: ShippingSettings, providerName?: 'DELHIVERY' | 'SHADOWFAX'): Promise<Shipment> {
    // 1. Idempotency Check — delete old FAILED/CANCELLED records before retry
    const existingQuery = await adminDb.collection('shipments').where('orderId', '==', order.id).get();
    if (!existingQuery.empty) {
      for (const doc of existingQuery.docs) {
        const existing = doc.data() as Shipment;
        if (existing.status === 'FAILED' || existing.status === 'CANCELLED') {
          // Delete old failed/cancelled records to allow clean retry
          await adminDb.collection('shipments').doc(doc.id).delete();
        } else {
          // Active shipment exists — return it
          console.log(`Shipment already exists for order ${order.id}. Skipping creation.`);
          return { ...existing, id: doc.id } as Shipment;
        }
      }
    }

    const settings = overrideSettings || await this.getSettings();
    const providerKey = providerName || settings.defaultProvider;
    const provider = this.providers.get(providerKey);

    if (!provider) {
      throw new Error(`Provider ${providerKey} not found`);
    }

    // 2. Prepare payload and create
    const now = new Date().toISOString();
    
    // Create preliminary record — filter out undefined fields to avoid Firestore error
    const shipmentRef = adminDb.collection('shipments').doc();
    const initialShipment: any = {
      id: shipmentRef.id,
      orderId: order.id,
      customerId: order.customerId,
      provider: provider.name,
      status: 'CREATING',
      deliveryAddressSnapshot: order.shippingAddress || null,
      createdAt: now,
      updatedAt: now
    };
    // Only include pickupAddressSnapshot if it has valid data
    if (settings.pickupAddress && settings.pickupAddress.pincode) {
      initialShipment.pickupAddressSnapshot = settings.pickupAddress;
    }
    
    await shipmentRef.set(initialShipment);

    try {
      // Use settings pickup address or fallback — partners already have the address
      const pickupAddr = settings.pickupAddress || {
        name: 'SoleVault',
        phone: '9999999999',
        address: 'Warehouse',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
        country: 'India'
      };
      const dims = settings.defaultPackageDimensions || { length: 10, breadth: 10, height: 10 };
      const result = await provider.createShipment(order, {
        pickupAddress: pickupAddr,
        weight: settings.defaultPackageWeight || 0.5,
        length: dims.length,
        breadth: dims.breadth,
        height: dims.height,
      });

      // 3. Update shipment record and order atomically
      const finalShipment: any = {
        providerShipmentId: result.providerShipmentId || null,
        awb: result.awb || null,
        courierName: result.courierName || null,
        trackingNumber: result.trackingNumber || result.awb || null,
        trackingUrl: result.trackingUrl || null,
        labelUrl: result.labelUrl || null,
        status: result.status,
        updatedAt: new Date().toISOString()
      };

      await adminDb.runTransaction(async (transaction) => {
        transaction.update(shipmentRef, finalShipment);
        
        transaction.update(adminDb.collection('orders').doc(order.id), {
          shipmentStatus: result.status,
          shipping: {
            provider: provider.name,
            courierName: result.courierName || null,
            awb: result.awb || null,
            trackingNumber: result.trackingNumber || result.awb || null,
            trackingUrl: result.trackingUrl || null
          },
          updatedAt: new Date().toISOString()
        });
      });

      // Fire and forget notifications
      adminDb.collection('users').doc(order.customerId).get().then(userDoc => {
        if (userDoc.exists) {
          const userData = userDoc.data();
          const email = userData?.email;
          const name = userData?.name || userData?.firstName || 'Customer';
          if (email) {
            notificationService.sendShipmentUpdate(order.id, order.customerId, email, name, 'Shipment Created', result.trackingUrl).catch(console.error);
          }
        }
      }).catch(console.error);

      return { ...initialShipment, ...finalShipment } as Shipment;

    } catch (error: any) {
      await shipmentRef.update({
        status: 'FAILED',
        errorInfo: error.message,
        updatedAt: new Date().toISOString()
      });
      throw error;
    }
  }

  async syncTracking(orderId: string): Promise<Shipment | null> {
    const existingQuery = await adminDb.collection('shipments').where('orderId', '==', orderId).limit(1).get();
    if (existingQuery.empty) {
      return null;
    }

    const shipment = { id: existingQuery.docs[0].id, ...existingQuery.docs[0].data() } as Shipment;
    
    if (!shipment.awb) {
      return shipment;
    }

    // Skip if already in terminal state and recently synced
    if (['DELIVERED', 'RETURNED', 'CANCELLED'].includes(shipment.status)) {
      return shipment;
    }

    const provider = this.providers.get(shipment.provider);
    if (!provider) {
      throw new Error(`Provider ${shipment.provider} not found`);
    }

    try {
      const trackingResult = await provider.getTracking(shipment.awb);
      
      const updateData: Partial<Shipment> = {
        status: trackingResult.status,
        lastSyncedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // In a real app we'd also store trackingResult.events in a subcollection or array.

      await adminDb.runTransaction(async (transaction) => {
        transaction.update(adminDb.collection('shipments').doc(shipment.id), updateData);
        
        // Map Shipment Status back to Order Status appropriately if needed
        const orderUpdate: any = {
          shipmentStatus: trackingResult.status,
          updatedAt: updateData.updatedAt
        };

        if (trackingResult.status === 'DELIVERED') {
          orderUpdate.status = 'DELIVERED';
        } else if (trackingResult.status === 'IN_TRANSIT') {
          orderUpdate.status = 'SHIPPED'; // internal mapping
        }

        transaction.update(adminDb.collection('orders').doc(orderId), orderUpdate);
      });

      // Fire and forget notifications
      adminDb.collection('users').doc(shipment.customerId).get().then(userDoc => {
        if (userDoc.exists) {
          const userData = userDoc.data();
          const email = userData?.email;
          const name = userData?.name || userData?.firstName || 'Customer';
          if (email) {
            notificationService.sendShipmentUpdate(orderId, shipment.customerId, email, name, trackingResult.status, shipment.trackingUrl).catch(console.error);
          }
        }
      }).catch(console.error);

      return { ...shipment, ...updateData } as Shipment;
    } catch (error) {
      console.error(`Failed to sync tracking for shipment ${shipment.id}:`, error);
      return shipment;
    }
  }

  async cancelShipment(orderId: string): Promise<boolean> {
    const existingQuery = await adminDb.collection('shipments').where('orderId', '==', orderId).limit(1).get();
    if (existingQuery.empty) {
      return true; // No shipment to cancel
    }

    const shipment = { id: existingQuery.docs[0].id, ...existingQuery.docs[0].data() } as Shipment;
    
    // If it's already terminal, we cannot cancel or don't need to cancel via API
    if (['DELIVERED', 'RETURNED', 'CANCELLED', 'FAILED'].includes(shipment.status)) {
      if (shipment.status === 'CANCELLED') return true;
      return false; // Can't cancel delivered or returned
    }

    const provider = this.providers.get(shipment.provider);
    if (!provider) {
      return false;
    }

    try {
      let cancelled = true;
      if (shipment.awb) {
        cancelled = await provider.cancelShipment(shipment.awb);
      } else if (shipment.providerShipmentId) {
        cancelled = await provider.cancelShipment(shipment.providerShipmentId);
      }

      if (cancelled) {
        await adminDb.collection('shipments').doc(shipment.id).update({
          status: 'CANCELLED',
          updatedAt: new Date().toISOString()
        });
        
        await adminDb.collection('orders').doc(orderId).update({
          shipmentStatus: 'CANCELLED',
          updatedAt: new Date().toISOString()
        });
      }
      return cancelled;
    } catch (error) {
      console.error(`Failed to cancel shipment for order ${orderId}:`, error);
      return false;
    }
  }
}

export const shippingService = new ShippingService();
