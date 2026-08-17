import { Response } from 'express';
import { adminDb } from '../config/firebase';
import { shippingService } from '../services/shipping';
import { AuthenticatedRequest } from '../types/auth';
import { Order } from '../types';

/**
 * Admin: Get shipping rates from all providers for an order
 */
export const getShippingRates = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const orderId = req.params.orderId as string;
    const { weight, length, breadth, height } = req.query;

    const orderDoc = await adminDb.collection('orders').doc(orderId).get();
    if (!orderDoc.exists) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = { id: orderDoc.id, ...orderDoc.data() } as Order;

    // Get pickup pincode from settings
    const settingsDoc = await adminDb.collection('settings').doc('shipping').get();
    const storeDoc = await adminDb.collection('settings').doc('store').get();
    const settings = settingsDoc.exists ? settingsDoc.data() : {};
    const storeData = storeDoc.exists ? storeDoc.data() : {};
    const pickupPincode = storeData?.warehousePincode || settings?.pickupAddress?.pincode || '400001';
    const deliveryPincode = order.shippingAddress?.pincode;

    if (!deliveryPincode) {
      return res.status(400).json({ error: 'Order has no delivery pincode' });
    }

    const pkgWeight = parseFloat(weight as string) || 0.5;

    // Fetch rates from all providers in parallel
    const results = await Promise.allSettled([
      shippingService.providers.get('DELHIVERY')?.getAvailableCouriers(pickupPincode, deliveryPincode, pkgWeight) || Promise.resolve([]),
      shippingService.providers.get('SHADOWFAX')?.getAvailableCouriers(pickupPincode, deliveryPincode, pkgWeight) || Promise.resolve([]),
    ]);

    const delhiveryRates = results[0].status === 'fulfilled' ? results[0].value : [];
    const shadowfaxRates = results[1].status === 'fulfilled' ? results[1].value : [];

    // Format the rates
    const rates = [];

    if (delhiveryRates.length > 0) {
      for (const courier of delhiveryRates.slice(0, 3)) {
        rates.push({
          provider: 'DELHIVERY',
          courierName: courier.courier_name || 'Delhivery',
          rate: courier.rate || courier.freight_charge || (40 + Math.round(pkgWeight * 30)),
          estimatedDays: courier.estimated_delivery_days || courier.etd || '3-5',
          codAvailable: courier.cod_available === true || courier.cod === 'Y',
          rating: courier.rating || null,
        });
      }
    }

    if (shadowfaxRates.length > 0) {
      for (const courier of shadowfaxRates.slice(0, 3)) {
        rates.push({
          provider: 'SHADOWFAX',
          courierName: courier.courier_name || 'Shadowfax',
          rate: courier.rate || courier.freight_charge || (30 + Math.round(pkgWeight * 20)),
          estimatedDays: courier.estimated_delivery_days || courier.etd || '1-3',
          codAvailable: courier.cod_available !== false,
          rating: courier.rating || null,
        });
      }
    }

    // If no rates returned from APIs, provide defaults per provider
    if (rates.filter(r => r.provider === 'DELHIVERY').length === 0) {
      rates.push({ provider: 'DELHIVERY', courierName: 'Delhivery (Standard)', rate: 50, estimatedDays: '3-5', codAvailable: true, rating: null });
    }
    if (rates.filter(r => r.provider === 'SHADOWFAX').length === 0) {
      rates.push({ provider: 'SHADOWFAX', courierName: 'Shadowfax (Express)', rate: 35, estimatedDays: '1-3', codAvailable: true, rating: null });
    }

    res.json({ rates, pickupPincode, deliveryPincode });
  } catch (error: any) {
    console.error('getShippingRates error:', error);
    res.status(500).json({ error: 'Failed to fetch shipping rates' });
  }
};

/**
 * Admin: Book a shipment for an order with specific dimensions and provider
 */
export const bookShipment = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const orderId = req.params.orderId as string;
    const { provider, weight, length, breadth, height } = req.body;

    if (!provider) {
      return res.status(400).json({ error: 'Provider is required (DELHIVERY or SHADOWFAX)' });
    }

    const orderDoc = await adminDb.collection('orders').doc(orderId).get();
    if (!orderDoc.exists) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = { id: orderDoc.id, ...orderDoc.data() } as Order;

    // Get settings with custom dimensions
    const settingsDoc = await adminDb.collection('settings').doc('shipping').get();
    const settings = settingsDoc.exists ? settingsDoc.data() as any : {};

    const customSettings = {
      ...settings,
      defaultPackageWeight: parseFloat(weight) || settings.defaultPackageWeight || 0.5,
      defaultPackageDimensions: {
        length: parseInt(length) || settings.defaultPackageDimensions?.length || 10,
        breadth: parseInt(breadth) || settings.defaultPackageDimensions?.breadth || 10,
        height: parseInt(height) || settings.defaultPackageDimensions?.height || 10,
      },
    };

    const shipment = await shippingService.createShipment(order, customSettings, provider as 'DELHIVERY' | 'SHADOWFAX');

    // Update order status to SHIPMENT_CREATED
    await adminDb.collection('orders').doc(orderId).update({
      status: 'SHIPMENT_CREATED',
      shipmentStatus: shipment.status,
      updatedAt: new Date().toISOString(),
    });

    res.json({ success: true, shipment });
  } catch (error: any) {
    console.error('bookShipment error:', error);
    res.status(500).json({ error: 'Failed to book shipment' });
  }
};

/**
 * Admin: Cancel a shipment for an order
 */
export const cancelShipment = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const orderId = req.params.orderId as string;

    const orderDoc = await adminDb.collection('orders').doc(orderId).get();
    if (!orderDoc.exists) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const cancelled = await shippingService.cancelShipment(orderId);

    if (!cancelled) {
      return res.status(400).json({ error: 'Could not cancel shipment. It may already be in transit or delivered.' });
    }

    // Reset order shipment status
    await adminDb.collection('orders').doc(orderId).update({
      shipmentStatus: 'CANCELLED',
      updatedAt: new Date().toISOString(),
    });

    res.json({ success: true, message: 'Shipment cancelled successfully' });
  } catch (error: any) {
    console.error('cancelShipment error:', error);
    res.status(500).json({ error: 'Failed to cancel shipment' });
  }
};

/**
 * Admin: Sync latest tracking for an order
 */
export const syncTracking = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const orderId = req.params.orderId as string;
    
    const shipment = await shippingService.syncTracking(orderId);
    if (!shipment) {
      return res.status(404).json({ error: 'No shipment found for order' });
    }

    res.json({ success: true, shipment });
  } catch (error: any) {
    console.error('syncTracking error:', error);
    res.status(500).json({ error: 'Failed to sync tracking' });
  }
};

/**
 * Customer: Get tracking details (Authenticated, must own the order)
 */
export const getTracking = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const orderId = req.params.orderId as string;
    const userId = req.user?.uid;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const orderDoc = await adminDb.collection('orders').doc(orderId).get();
    if (!orderDoc.exists) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderDoc.data() as Order;
    
    // Ensure the customer owns this order
    if (order.customerId !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Try to sync tracking to get latest data
    const shipment = await shippingService.syncTracking(orderId);
    
    if (!shipment) {
      return res.status(404).json({ error: 'Tracking not available yet' });
    }

    // Return sanitized data (no internal errors or provider secrets)
    res.json({
      success: true,
      tracking: {
        status: shipment.status,
        courierName: shipment.courierName,
        awb: shipment.awb,
        trackingNumber: shipment.trackingNumber,
        trackingUrl: shipment.trackingUrl,
        lastSyncedAt: shipment.lastSyncedAt
      }
    });
  } catch (error: any) {
    console.error('getTracking error:', error);
    res.status(500).json({ error: 'Failed to get tracking' });
  }
};

/**
 * Admin: Get shipping label for an order
 */
export const getShipmentLabel = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const orderId = req.params.orderId as string;

    const shipmentQuery = await adminDb.collection('shipments').where('orderId', '==', orderId).limit(1).get();
    if (shipmentQuery.empty) {
      return res.status(404).json({ error: 'No shipment found for this order' });
    }

    const shipment = shipmentQuery.docs[0].data();

    if (shipment.labelUrl) {
      // Redirect to the label URL (usually a PDF)
      return res.redirect(shipment.labelUrl);
    }

    if (!shipment.awb) {
      return res.status(400).json({ error: 'AWB not assigned yet. Label not available.' });
    }

    // Try to get label from provider
    const provider = shippingService.providers?.get(shipment.provider);
    if (provider && 'getLabel' in provider) {
      try {
        const labelData = await (provider as any).getLabel(shipment.awb);
        if (labelData?.labelUrl) {
          // Update shipment with label URL
          await adminDb.collection('shipments').doc(shipmentQuery.docs[0].id).update({
            labelUrl: labelData.labelUrl,
            updatedAt: new Date().toISOString()
          });
          return res.redirect(labelData.labelUrl);
        }
        if (labelData?.buffer) {
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', `label-${orderId}.pdf`);
          return res.send(labelData.buffer);
        }
      } catch (labelErr) {
        console.error('Provider label fetch failed:', labelErr);
      }
    }

    // Fallback: generate a simple label from order data
    const orderDoc = await adminDb.collection('orders').doc(orderId).get();
    if (!orderDoc.exists) {
      return res.status(404).json({ error: 'Order not found' });
    }
    const order = orderDoc.data() as Order;

    res.json({
      success: true,
      label: {
        orderId: order.id,
        awb: shipment.awb,
        courier: shipment.courierName,
        trackingNumber: shipment.trackingNumber,
        trackingUrl: shipment.trackingUrl,
        from: shipment.pickupAddressSnapshot,
        to: order.shippingAddress,
        items: order.items
      },
      message: 'Label data returned. Use tracking URL to print from courier portal.'
    });
  } catch (error: any) {
    console.error('getShipmentLabel error:', error);
    res.status(500).json({ error: 'Failed to get label' });
  }
};

/**
 * Admin: Bulk sync all active shipments
 */
export const bulkSyncTracking = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const activeStatuses = ['CREATED', 'AWB_ASSIGNED', 'READY_TO_SHIP', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'];
    const shipmentsSnap = await adminDb.collection('shipments')
      .where('status', 'in', activeStatuses)
      .get();

    let synced = 0;
    let failed = 0;

    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    for (const doc of shipmentsSnap.docs) {
      const shipment = doc.data();
      // Skip if recently synced
      if (shipment.lastSyncedAt && shipment.lastSyncedAt > fiveMinAgo) continue;

      try {
        await shippingService.syncTracking(shipment.orderId);
        synced++;
      } catch {
        failed++;
      }
    }

    res.json({ success: true, synced, failed, total: shipmentsSnap.docs.length });
  } catch (error: any) {
    console.error('bulkSyncTracking error:', error);
    res.status(500).json({ error: 'Failed to bulk sync' });
  }
};
