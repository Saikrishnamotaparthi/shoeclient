import axios from 'axios';
import { ShippingProvider, CreateShipmentResult, TrackingResult, TrackingEvent } from './types';
import { Order, ShipmentStatus } from '../../types';

const DELHIVERY_API_TOKEN = process.env.DELHIVERY_API_TOKEN || '';
// Uses test URL if token isn't production, or fallback. Typically Delhivery provides different URLs or tokens.
const BASE_URL = 'https://track.delhivery.com'; 

const mapStatus = (status: string): ShipmentStatus => {
  const s = status.toUpperCase();
  if (s.includes('MANIFEST')) return 'CREATED';
  if (s.includes('DISPATCHED') || s.includes('IN TRANSIT') || s.includes('PENDING')) return 'IN_TRANSIT';
  if (s.includes('OUT FOR DELIVERY')) return 'OUT_FOR_DELIVERY';
  if (s.includes('DELIVERED')) return 'DELIVERED';
  if (s.includes('RTO') || s.includes('RETURN')) return 'RETURNED';
  if (s.includes('CANCEL')) return 'CANCELLED';
  if (s.includes('PICKED UP')) return 'PICKED_UP';
  return 'PENDING';
};

export class DelhiveryProvider implements ShippingProvider {
  readonly name = 'DELHIVERY';

  private getHeaders() {
    if (!DELHIVERY_API_TOKEN) {
      throw new Error('Delhivery credentials missing from environment');
    }
    return {
      'Authorization': `Token ${DELHIVERY_API_TOKEN}`,
      'Content-Type': 'application/json'
    };
  }

  async createShipment(order: Order, options?: any): Promise<CreateShipmentResult> {
    const weight = options?.weight || 0.5; // in kg
    const weightGrams = Math.round(weight * 1000); // Delhivery uses grams

    // Delhivery expects data as a JSON string with shipments and pickup_location
    const requestData = {
      shipments: [
        {
          name: order.shippingAddress.fullName,
          add: order.shippingAddress.street,
          pin: order.shippingAddress.pincode,
          city: order.shippingAddress.city,
          state: order.shippingAddress.state,
          country: 'India',
          phone: order.shippingAddress.phone,
          order: order.id,
          payment_mode: order.paymentMethod === 'COD' ? 'COD' : 'Prepaid',
          return_pin: options?.pickupAddress?.pincode || '',
          return_city: options?.pickupAddress?.city || '',
          return_phone: options?.pickupAddress?.phone || '',
          return_add: options?.pickupAddress?.address || '',
          return_state: options?.pickupAddress?.state || '',
          return_country: 'India',
          products_desc: order.items.map((i: any) => i.name).join(', '),
          hsn_code: '6404',
          cod_amount: order.paymentMethod === 'COD' ? order.total : 0,
          order_date: new Date(order.createdAt).toISOString(),
          total_amount: order.total,
          seller_add: options?.pickupAddress?.address || '',
          seller_name: options?.pickupAddress?.name || 'SoleVault',
          seller_inv: order.id,
          quantity: order.items.reduce((acc: number, i: any) => acc + i.quantity, 0),
          weight: weightGrams,
          waybill: ''
        }
      ],
      pickup_location: {
        name: 'DOT FREELANCER B2C',
        add: options?.pickupAddress?.address || '',
        city: options?.pickupAddress?.city || '',
        pin_code: options?.pickupAddress?.pincode || '',
        country: 'India',
        phone: options?.pickupAddress?.phone || ''
      }
    };

    try {
      const formData = `format=json&data=${encodeURIComponent(JSON.stringify(requestData))}`;
      console.log('Delhivery createShipment - pickup_location:', JSON.stringify(requestData.pickup_location));
      console.log('Delhivery createShipment - endpoint:', `${BASE_URL}/api/cmu/create.json`);
      
      const response = await axios.post(`${BASE_URL}/api/cmu/create.json`, formData, {
        headers: {
          'Authorization': `Token ${DELHIVERY_API_TOKEN}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      
      const resData = response.data;
      console.log('Delhivery API response:', JSON.stringify(resData));
      const packageData = resData?.packages?.[0];
      
      let errorMsg = '';
      if (Array.isArray(packageData?.remarks) && packageData.remarks.length > 0) {
        errorMsg = packageData.remarks.join(', ');
      } else if (typeof packageData?.rmk === 'string' && packageData.rmk) {
        errorMsg = packageData.rmk;
      } else if (typeof resData?.rmk === 'string' && resData.rmk) {
        errorMsg = resData.rmk;
      } else if (typeof resData?.error === 'string' && resData.error) {
        errorMsg = resData.error;
      } else if (resData?.status && resData?.status !== 'SUCCESS' && resData?.status !== 'OK') {
        errorMsg = `Delhivery status: ${resData.status}`;
      }

      if (errorMsg || resData?.success === false || packageData?.status === 'FAIL') {
        // Provide specific guidance for warehouse mismatch errors
        if (errorMsg?.includes('ClientWarehouse') || errorMsg?.includes('warehouse') || errorMsg?.includes('pickup')) {
          throw new Error(`Delhivery pickup location "DOT FREELANCER B2C" not found. Please verify this location is registered in your Delhivery account at https://one.delhivery.com. Error: ${errorMsg}`);
        }
        throw new Error(errorMsg || 'Failed to create shipment in Delhivery. Check pickup warehouse registration.');
      }

      return {
        providerShipmentId: packageData?.client_fl_id || order.id,
        awb: packageData?.waybill,
        courierName: 'Delhivery',
        status: packageData?.waybill ? 'AWB_ASSIGNED' : 'CREATED'
      };
    } catch (error: any) {
      console.error('Delhivery createShipment failed:', error?.response?.data || error?.message || error);
      const data = error?.response?.data;
      let errDetail = error?.message;
      if (typeof data === 'object') {
        errDetail = (typeof data?.error === 'string' ? data.error : null) || (typeof data?.rmk === 'string' ? data.rmk : null) || JSON.stringify(data);
      }
      throw new Error(errDetail || 'Failed to create shipment in Delhivery');
    }
  }

  async getTracking(awb: string): Promise<TrackingResult> {
    try {
      const response = await axios.get(`${BASE_URL}/api/v1/packages/json/`, {
        headers: this.getHeaders(),
        params: { waybill: awb }
      });
      
      const shipData = response.data.ShipmentData?.[0]?.Shipment;
      if (!shipData) {
        throw new Error('Tracking not found');
      }

      const scans = shipData.Scans || [];
      const events: TrackingEvent[] = scans.map((s: any) => ({
        status: s.Scan?.ScanDetail?.Scan,
        date: s.Scan?.ScanDetail?.ScanDateTime,
        location: s.Scan?.ScanDetail?.ScannedLocation,
        activity: s.Scan?.ScanDetail?.Instructions
      }));

      return {
        status: mapStatus(shipData.Status?.Status || 'PENDING'),
        events,
        expectedDelivery: shipData.ExpectedDeliveryDate
      };
    } catch (error: any) {
      console.error('Delhivery getTracking failed:', error?.response?.data || error);
      throw new Error('Failed to fetch tracking from Delhivery');
    }
  }

  async cancelShipment(awb: string): Promise<boolean> {
    try {
      const response = await axios.post(`${BASE_URL}/api/p/edit`, {
        waybill: awb,
        cancellation: true
      }, {
        headers: this.getHeaders()
      });
      
      return response.data?.success || false;
    } catch (error: any) {
      console.error('Delhivery cancelShipment failed:', error?.response?.data || error);
      throw new Error('Failed to cancel shipment');
    }
  }

  async getAvailableCouriers(pickupPincode: string, deliveryPincode: string, weight: number): Promise<any[]> {
    try {
      const response = await axios.get(`${BASE_URL}/c/api/pin-codes/json/`, {
        headers: this.getHeaders(),
        params: { filter_codes: deliveryPincode }
      });
      
      const data = response.data?.delivery_codes?.[0]?.postal_code;
      if (data && (data.pre_paid === 'Y' || data.cod === 'Y')) {
        return [{
          courier_name: 'Delhivery',
          estimated_delivery_days: 3,
          cod_available: data.cod === 'Y',
          rate: 40 + Math.round(weight * 30), // Weight-based rate
        }];
      }
      return [];
    } catch (error: any) {
      console.error('Delhivery serviceability failed:', error?.response?.data || error);
      return [];
    }
  }
}
