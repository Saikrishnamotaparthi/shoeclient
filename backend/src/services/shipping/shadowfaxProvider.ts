import axios from 'axios';
import { ShippingProvider, CreateShipmentResult, TrackingResult, TrackingEvent } from './types';
import { Order, ShipmentStatus } from '../../types';

const SHADOWFAX_API_KEY = process.env.SHADOWFAX_API_KEY || '';
const BASE_URL = (process.env.SHADOWFAX_BASE_URL || 'https://dale.shadowfax.in').replace(/\/+$/, '');

console.log(`[Shadowfax] Key: ${SHADOWFAX_API_KEY ? SHADOWFAX_API_KEY.slice(0,8) + '...' : 'MISSING'}, Base: ${BASE_URL}`);

const mapStatus = (status: string): ShipmentStatus => {
  const s = (status || '').toLowerCase();
  if (s === 'new') return 'CREATED';
  if (s.includes('assigned_for_seller_pickup') || s.includes('assigned_for_pickup')) return 'AWB_ASSIGNED';
  if (s.includes('ofp') || s.includes('out_for_pickup')) return 'READY_TO_SHIP';
  if (s === 'picked' || s.includes('received_from_client')) return 'PICKED_UP';
  if (s.includes('in_transit') || s.includes('bag_in_transit') || s.includes('manifested') || s.includes('recd_at_fwd')) return 'IN_TRANSIT';
  if (s === 'ofd' || s.includes('assigned_for_delivery') || s.includes('out_for_delivery')) return 'OUT_FOR_DELIVERY';
  if (s === 'delivered') return 'DELIVERED';
  if (s.includes('cancelled')) return 'CANCELLED';
  if (s.includes('rts') || s.includes('rto') || s.includes('return')) return 'RETURNED';
  if (s === 'lost') return 'FAILED';
  return 'PENDING';
};

export class ShadowfaxProvider implements ShippingProvider {
  readonly name = 'SHADOWFAX';

  private getHeaders() {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Token ${SHADOWFAX_API_KEY}`,
    };
  }

  async createShipment(order: Order, options?: any): Promise<CreateShipmentResult> {
    if (!SHADOWFAX_API_KEY) {
      throw new Error('Shadowfax API key missing. Add SHADOWFAX_API_KEY to .env');
    }

    const weight = options?.weight || 0.5;
    const length = options?.length || 10;
    const breadth = options?.breadth || 10;
    const height = options?.height || 10;

    // Per docs: POST /v3/clients/orders/ with order_type: "warehouse"
    const payload = {
      order_type: 'warehouse',
      order_details: {
        client_order_id: order.id,
        actual_weight: Math.round(weight * 1000),
        volumetric_weight: Math.round((length * breadth * height) / 5000 * 1000),
        product_value: order.subtotal || order.items.reduce((sum, i) => sum + i.price * i.quantity, 0),
        payment_mode: order.paymentMethod === 'COD' ? 'COD' : 'Prepaid',
        cod_amount: order.paymentMethod === 'COD' ? String(order.total) : '0',
        total_amount: order.total,
        order_service: 'regular',
      },
      customer_details: {
        name: order.shippingAddress.fullName || 'Customer',
        contact: String(order.shippingAddress.phone || '').replace(/\D/g, ''),
        address_line_1: order.shippingAddress.street || '',
        address_line_2: order.shippingAddress.landmark || '',
        city: order.shippingAddress.city || '',
        state: order.shippingAddress.state || '',
        pincode: Number(order.shippingAddress.pincode) || 0,
      },
      pickup_details: {
        name: options?.pickupAddress?.name || 'SoleVault Warehouse',
        contact: String(options?.pickupAddress?.phone || '9999999999').replace(/\D/g, ''),
        address_line_1: options?.pickupAddress?.address || 'Warehouse Address',
        address_line_2: '',
        city: options?.pickupAddress?.city || 'Mumbai',
        state: options?.pickupAddress?.state || 'Maharashtra',
        pincode: Number(options?.pickupAddress?.pincode || '400001'),
        unique_code: options?.pickupAddress?.uniqueCode || 'solevault_warehouse',
      },
      rto_details: {
        name: options?.pickupAddress?.name || 'SoleVault Warehouse',
        contact: String(options?.pickupAddress?.phone || '9999999999').replace(/\D/g, ''),
        address_line_1: options?.pickupAddress?.address || 'Warehouse Address',
        address_line_2: '',
        city: options?.pickupAddress?.city || 'Mumbai',
        state: options?.pickupAddress?.state || 'Maharashtra',
        pincode: Number(options?.pickupAddress?.pincode || '400001'),
        unique_code: options?.pickupAddress?.uniqueCode || 'solevault_warehouse',
      },
      product_details: order.items.map(item => ({
        sku_name: item.name,
        sku_id: item.productId,
        price: item.price,
        hsn_code: '6404',
        additional_details: {
          quantity: item.quantity,
        },
      })),
    };

    const fullUrl = `${BASE_URL}/v3/clients/orders/`;
    console.log(`Shadowfax: POST ${fullUrl}`);
    console.log(`Shadowfax: payload`, JSON.stringify(payload).slice(0, 300));

    try {
      const response = await axios.post(fullUrl, payload, {
        headers: this.getHeaders(),
        timeout: 20000,
      });

      const data = response.data;
      console.log(`Shadowfax: Success`, JSON.stringify(data).slice(0, 300));

      if (data.message === 'Failure' || data.errors) {
        const errDetail = typeof data.errors === 'string' ? data.errors :
          Array.isArray(data.errors) ? data.errors.join(', ') :
          typeof data.errors === 'object' ? JSON.stringify(data.errors) : 'Unknown error';
        console.log(`Shadowfax: API Failure:`, errDetail);
        throw new Error(errDetail);
      }

      const awb = data.data?.awb_number;
      return {
        providerShipmentId: awb || data.data?.id?.toString() || order.id,
        awb: awb,
        courierName: 'Shadowfax',
        trackingNumber: awb,
        trackingUrl: `https://www.shadowfax.in/track/${awb || ''}`,
        status: awb ? 'AWB_ASSIGNED' : 'CREATED',
      };
    } catch (error: any) {
      // If it's our own thrown error from API failure, re-throw as-is
      if (error.message && !error.response) {
        throw error;
      }
      const errData = error?.response?.data;
      const errMsg = errData?.errors || errData?.detail || errData?.message || error?.message;
      const status = error?.response?.status;
      console.log(`Shadowfax: HTTP ${status}:`, typeof errMsg === 'object' ? JSON.stringify(errMsg) : errMsg);

      if (status === 401 || status === 403) {
        throw new Error(`Shadowfax auth failed. Check API key.`);
      }
      throw new Error(typeof errMsg === 'string' ? errMsg : JSON.stringify(errMsg));
    }
  }

  async getTracking(awb: string): Promise<TrackingResult> {
    try {
      const response = await axios.get(`${BASE_URL}/v4/clients/orders/${awb}/track/`, {
        headers: this.getHeaders(),
        timeout: 15000,
      });

      const data = response.data;
      const details = data.order_details || data;
      const trackingData = details.tracking_details || [];
      const currentStatus = details.status || 'PENDING';

      const events: TrackingEvent[] = trackingData.map((t: any) => ({
        status: t.status_id || t.status || '',
        date: t.created || t.event_timestamp || '',
        location: t.location || t.current_location || '',
        activity: t.remarks || t.comments || t.status || '',
      }));

      return {
        status: mapStatus(currentStatus),
        events,
        expectedDelivery: details.promised_delivery_date,
      };
    } catch (error: any) {
      console.log(`Shadowfax tracking error: ${error?.response?.status || error?.message}`);
      throw new Error('Failed to fetch tracking from Shadowfax');
    }
  }

  async cancelShipment(awb: string): Promise<boolean> {
    try {
      const response = await axios.post(`${BASE_URL}/v3/clients/orders/cancel/`, {
        request_id: awb,
        cancel_remarks: 'Cancelled by merchant',
      }, { headers: this.getHeaders(), timeout: 15000 });

      const data = response.data;
      return data.responseCode === 200 || data.responseCode === 304;
    } catch (error: any) {
      console.error('Shadowfax cancel failed:', error?.response?.data || error?.message);
      return false;
    }
  }

  async getAvailableCouriers(pickupPincode: string, deliveryPincode: string, weight: number): Promise<any[]> {
    if (!SHADOWFAX_API_KEY) return [];
    try {
      const response = await axios.get(`${BASE_URL}/v1/clients/serviceability/`, {
        headers: this.getHeaders(),
        params: {
          service: 'customer_delivery',
          pincodes: deliveryPincode,
          page: 1,
          count: 10,
        },
        timeout: 10000,
      });

      const data = response.data;
      const pincodes = Array.isArray(data) ? data : data?.results || [];
      const isServiceable = pincodes.some((p: any) =>
        String(p.code || p.pincode) === String(deliveryPincode)
      );

      if (!isServiceable) return [];

      return [{
        courier_name: 'Shadowfax',
        estimated_delivery_days: 2,
        cod_available: true,
        rate: 30 + Math.round(weight * 20),
      }];
    } catch (error: any) {
      console.log(`Shadowfax serviceability: ${error?.response?.status}: ${error?.response?.data?.detail || error?.message}`);
      return [];
    }
  }
}
