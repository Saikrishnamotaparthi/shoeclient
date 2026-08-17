import { adminDb } from '../config/firebase';
import { Product, CartItem, Coupon } from '../types';

export interface CheckoutValidationRequest {
  items: { productId: string; size: string; quantity: number }[];
  couponCode?: string;
  shippingAddressId?: string;
}

export interface CheckoutValidationResult {
  items: CartItem[];
  subtotal: number;
  discount: number;
  shipping: number;
  tax: number;
  total: number;
  currency: string;
  couponApplied?: {
    code: string;
    type: 'percentage' | 'fixed';
    value: number;
  };
}

// ─── Shipping ─────────────────────────────────────────────────────────────────
const getShippingSettings = async (): Promise<{ freeThreshold: number; flatRate: number }> => {
  try {
    const snap = await adminDb.collection('settings').doc('store').get();
    const data = snap.exists ? snap.data()! : {};
    return {
      freeThreshold: data.freeShippingThreshold ?? 999,   // default ₹999
      flatRate: data.flatShippingRate ?? 99,               // default ₹99
    };
  } catch {
    return { freeThreshold: 999, flatRate: 99 };
  }
};

const calculateShipping = (
  subtotalAfterDiscount: number,
  { freeThreshold, flatRate }: { freeThreshold: number; flatRate: number }
): number => {
  // 100% off coupon or other full discount → always free shipping
  if (subtotalAfterDiscount <= 0) return 0;
  // Above free-shipping threshold → free
  if (subtotalAfterDiscount >= freeThreshold) return 0;
  return flatRate;
};

// ─── Coupon ───────────────────────────────────────────────────────────────────
const validateCoupon = async (
  code: string,
  subtotal: number
): Promise<{ valid: boolean; reason?: string; discountAmount?: number; coupon?: Coupon }> => {
  code = code.toUpperCase();
  const snap = await adminDb.collection('coupons').where('code', '==', code).limit(1).get();

  if (snap.empty) return { valid: false, reason: 'Coupon does not exist' };

  const coupon = snap.docs[0].data() as Coupon;

  if (!coupon.isActive) return { valid: false, reason: 'Coupon is no longer active' };

  if (coupon.startDate && new Date(coupon.startDate) > new Date()) {
    return { valid: false, reason: 'Coupon is not yet active' };
  }

  if (coupon.expiryDate && new Date(coupon.expiryDate) < new Date()) {
    return { valid: false, reason: 'Coupon has expired' };
  }

  if (coupon.minOrderValue && subtotal < coupon.minOrderValue) {
    return {
      valid: false,
      reason: `Minimum order value of ₹${coupon.minOrderValue} required`,
    };
  }

  if (
    coupon.usageLimit &&
    coupon.usedCount !== undefined &&
    coupon.usedCount >= coupon.usageLimit
  ) {
    return { valid: false, reason: 'Coupon usage limit reached' };
  }

  let discountAmount = 0;
  if (coupon.type === 'percentage') {
    discountAmount = (subtotal * coupon.value) / 100;
    if (coupon.maxDiscount && discountAmount > coupon.maxDiscount) {
      discountAmount = coupon.maxDiscount;
    }
  } else if (coupon.type === 'fixed') {
    discountAmount = coupon.value;
  }

  // Cap discount at subtotal so it never goes negative
  discountAmount = Math.min(discountAmount, subtotal);

  return { valid: true, discountAmount, coupon };
};

// ─── Main validate ─────────────────────────────────────────────────────────────
export const validateCart = async (
  req: CheckoutValidationRequest
): Promise<CheckoutValidationResult> => {
  if (!req.items || req.items.length === 0) throw new Error('Cart is empty');
  if (req.items.length > 10) throw new Error('Too many unique items in cart');

  const hydratedItems: CartItem[] = [];
  let subtotal = 0;

  // Load products in parallel
  const productIds = [...new Set(req.items.map(item => item.productId))];
  const productsSnap = await adminDb
    .collection('products')
    .where('__name__', 'in', productIds)
    .get();

  const productsMap = new Map<string, Product>();
  productsSnap.docs.forEach(doc => {
    productsMap.set(doc.id, { id: doc.id, ...doc.data() } as Product);
  });

  for (const item of req.items) {
    if (item.quantity <= 0) throw new Error(`Invalid quantity for product ${item.productId}`);

    const product = productsMap.get(item.productId);
    if (!product) throw new Error(`Product ${item.productId} not found`);
    if (!product.isActive) throw new Error(`Product ${product.name} is currently unavailable`);

    // Check product status — block non-purchasable statuses
    const nonPurchasable = ['COMING_SOON', 'SOLD_OUT', 'INACTIVE', 'RESTOCKING_SOON'];
    if (product.productStatus && nonPurchasable.includes(product.productStatus)) {
      const statusLabels: Record<string, string> = {
        COMING_SOON: 'Coming Soon',
        SOLD_OUT: 'Sold Out',
        INACTIVE: 'Unavailable',
        RESTOCKING_SOON: 'Restocking Soon',
      };
      throw new Error(`${product.name} is ${statusLabels[product.productStatus] || 'unavailable'} and cannot be purchased`);
    }

    const sizeData = product.sizes.find(s => s.size === item.size);
    if (!sizeData) throw new Error(`Size ${item.size} is not available for ${product.name}`);
    if (sizeData.stock < item.quantity) {
      throw new Error(`Insufficient stock for ${product.name} (Size: ${item.size})`);
    }

    const itemPrice = (product.discountPrice && product.discountPrice < product.price) ? product.discountPrice : product.price;
    subtotal += itemPrice * item.quantity;

    hydratedItems.push({
      productId: product.id,
      name: product.name,
      size: item.size,
      quantity: item.quantity,
      price: itemPrice,
      image: product.images[0] || '',
    });
  }

  // Apply coupon
  let discount = 0;
  let couponApplied;

  if (req.couponCode) {
    const couponRes = await validateCoupon(req.couponCode, subtotal);
    if (couponRes.valid) {
      discount = couponRes.discountAmount!;
      couponApplied = {
        code: req.couponCode,
        type: couponRes.coupon!.type,
        value: couponRes.coupon!.value,
      };
    } else {
      throw new Error(couponRes.reason || 'Invalid coupon');
    }
  }

  // Calculate shipping — waived when coupon brings subtotal to ₹0
  const subtotalAfterDiscount = Math.max(0, subtotal - discount);
  const shippingSettings = await getShippingSettings();
  const shipping = calculateShipping(subtotalAfterDiscount, shippingSettings);

  const tax = 0; // All prices are GST-inclusive
  const total = Math.max(0, subtotalAfterDiscount + shipping + tax);

  return {
    items: hydratedItems,
    subtotal,
    discount,
    shipping,
    tax,
    total,
    currency: 'INR',
    couponApplied,
  };
};
