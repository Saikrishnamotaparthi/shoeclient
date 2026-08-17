export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  dob?: string;
  isAdmin: boolean;
  createdAt: string;
}

export interface SizeStock {
  size: string;
  stock: number;
  reorderLevel?: number;
}

export type ProductStatus = 'ACTIVE' | 'COMING_SOON' | 'RESTOCKING_SOON' | 'SOLD_OUT' | 'INACTIVE';

export interface Coupon {
  id?: string;
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  minOrderValue?: number;
  maxDiscount?: number;
  startDate?: string;
  expiryDate?: string;
  isActive: boolean;
  usageLimit?: number;
  usedCount?: number;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  brand: string;
  description: string;
  material?: string;
  careInstructions?: string;
  fit?: string;
  price: number;
  discountPrice?: number;
  images: string[];
  sizes: SizeStock[];
  category: string;
  collection?: string;
  tags: string[];
  isFeatured: boolean;
  isNewArrival: boolean;
  isActive: boolean;
  productStatus?: ProductStatus;
  badges: string[];
  ratings: {
    average: number;
    count: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CartItem {
  productId: string;
  size: string;
  quantity: number;
  name: string;
  price: number;
  image: string;
}

export type ShipmentStatus = 
  | 'NOT_REQUIRED' 
  | 'PENDING' 
  | 'CREATING' 
  | 'CREATED' 
  | 'AWB_ASSIGNED' 
  | 'READY_TO_SHIP' 
  | 'PICKED_UP' 
  | 'IN_TRANSIT' 
  | 'OUT_FOR_DELIVERY' 
  | 'DELIVERED' 
  | 'CANCELLED' 
  | 'FAILED' 
  | 'RETURNED';

export type PaymentStatus = 'created' | 'authorized' | 'captured' | 'failed' | 'refunded';

export interface Payment {
  id: string; // Razorpay payment ID or internal generated ID
  orderId: string; // Our internal order ID
  razorpayOrderId?: string;
  amount: number;
  currency: string;
  method: 'RAZORPAY' | 'COD';
  status: PaymentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface WebhookEvent {
  id: string; // Event ID from Razorpay
  type: string; // e.g. 'payment.captured'
  processedAt: string;
  orderId?: string;
  status: 'processed' | 'failed';
  error?: string;
}

export type OrderStatus = 
  | 'PLACED' 
  | 'CONFIRMED' 
  | 'PROCESSING' 
  | 'PACKED' 
  | 'SHIPMENT_CREATED' 
  | 'SHIPPED' 
  | 'OUT_FOR_DELIVERY' 
  | 'DELIVERED' 
  | 'PAYMENT_FAILED' 
  | 'CANCELLED' 
  | 'RETURN_REQUESTED' 
  | 'RETURN_APPROVED' 
  | 'RETURNED' 
  | 'REFUND_PENDING' 
  | 'REFUNDED';

export type RefundStatus = 'REQUESTED' | 'PROCESSING' | 'PROCESSED' | 'FAILED' | 'CANCELLED';

export interface Refund {
  id: string;
  orderId: string;
  paymentId?: string;
  customerId: string;
  amount: number;
  currency: string;
  reason: string;
  status: RefundStatus;
  razorpayRefundId?: string;
  initiatedBy: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export type ReturnStatus = 'REQUESTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'PICKUP_PENDING' | 'RECEIVED' | 'REFUND_PENDING' | 'REFUNDED' | 'CANCELLED';

export type ReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'HIDDEN';

export interface Review {
  id: string;
  productId: string;
  customerId: string;
  customerName: string;
  rating: number; // 1 to 5
  title: string;
  body: string;
  orderId: string;
  verifiedPurchase: boolean;
  status: ReviewStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewReport {
  id: string;
  reviewId: string;
  reporterId: string;
  reason: string;
  status: 'PENDING' | 'RESOLVED' | 'DISMISSED';
  createdAt: string;
}

export interface ReturnRequest {
  id: string;
  orderId: string;
  customerId: string;
  items: {
    productId: string;
    size: string;
    quantity: number;
    price: number;
  }[];
  reason: string;
  customerNote?: string;
  status: ReturnStatus;
  requestedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  approvedAt?: string;
  rejectedAt?: string;
  completedAt?: string;
  refundId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  productId: string;
  name: string;
  size: string;
  quantity: number;
  price: number;
  image: string;
}

export interface Address {
  id: string;
  fullName: string;
  phone: string;
  street: string;
  landmark?: string;
  city: string;
  state: string;
  pincode: string;
  lat?: number;
  lng?: number;
  isDefault: boolean;
}

export interface ShippingSettings {
  defaultProvider: 'SHIPROCKET' | 'DELHIVERY';
  automaticShipmentEnabled: boolean;
  freeShippingThreshold: number;
  defaultShippingFee: number;
  defaultPackageWeight: number; // in kg
  defaultPackageDimensions: {
    length: number;
    breadth: number;
    height: number;
  };
  pickupAddress: {
    name: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
  };
}

export interface Shipment {
  id: string; // our internal document id
  orderId: string;
  customerId: string;
  provider: 'SHIPROCKET' | 'DELHIVERY';
  providerShipmentId?: string; // ID returned by the provider
  awb?: string;
  courierName?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  status: ShipmentStatus;
  pickupAddressSnapshot?: any;
  deliveryAddressSnapshot?: any;
  packageInfo?: any;
  labelUrl?: string;
  errorInfo?: string;
  createdAt: string;
  updatedAt: string;
  lastSyncedAt?: string;
}

export interface Order {
  id: string;
  customerId: string;
  items: OrderItem[];
  subtotal: number;
  shippingFee: number;
  discount: number;
  total: number;
  couponCode?: string;
  shippingAddress: Address;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  shipmentStatus: ShipmentStatus;
  paymentId?: string;
  paymentMethod: 'RAZORPAY' | 'COD';
  razorpayOrderId?: string;
  shipping?: {
    provider: string;
    courierName?: string;
    awb?: string;
    trackingNumber?: string;
    trackingUrl?: string;
  };
  createdAt: string;
  updatedAt: string;
}
