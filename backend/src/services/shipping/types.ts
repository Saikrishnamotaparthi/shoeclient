import { Order, ShipmentStatus } from '../../types';

export interface CreateShipmentResult {
  providerShipmentId: string;
  awb?: string;
  courierName?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  labelUrl?: string;
  status: ShipmentStatus;
}

export interface TrackingEvent {
  status: string;
  date: string;
  location: string;
  activity: string;
}

export interface TrackingResult {
  status: ShipmentStatus;
  events: TrackingEvent[];
  expectedDelivery?: string;
}

export interface ShippingProvider {
  /**
   * Identifies the provider (e.g. 'SHIPROCKET', 'DELHIVERY', 'SHADOWFAX')
   */
  readonly name: 'DELHIVERY' | 'SHADOWFAX';

  /**
   * Creates a shipment and returns provider IDs and initial tracking
   */
  createShipment(order: Order, options?: any): Promise<CreateShipmentResult>;

  /**
   * Fetches latest tracking data
   */
  getTracking(awb: string): Promise<TrackingResult>;

  /**
   * Cancels a shipment
   */
  cancelShipment(awb: string): Promise<boolean>;

  /**
   * Returns available couriers for a given route/weight
   */
  getAvailableCouriers(pickupPincode: string, deliveryPincode: string, weight: number): Promise<any[]>;
}
