import Razorpay from 'razorpay';

import crypto from 'crypto';

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
  console.warn('WARNING: Razorpay credentials are not configured. Payments will fail.');
}

const razorpay = new Razorpay({
  key_id: RAZORPAY_KEY_ID || '',
  key_secret: RAZORPAY_KEY_SECRET || '',
});

export const createRazorpayOrder = async (amount: number, receiptId: string) => {
  // Amount in paise (multiply by 100)
  const options = {
    amount: Math.round(amount * 100),
    currency: 'INR',
    receipt: receiptId,
  };

  try {
    const order = await razorpay.orders.create(options);
    return order;
  } catch (error) {
    console.error('Razorpay order creation failed:', error);
    throw error;
  }
};

export const createRazorpayRefund = async (paymentId: string, amount: number, receiptId: string, notes?: Record<string, string>) => {
  // Amount in paise
  const options: any = {
    amount: Math.round(amount * 100),
    receipt: receiptId,
  };
  
  if (notes) {
    options.notes = notes;
  }

  try {
    const refund = await razorpay.payments.refund(paymentId, options);
    return refund;
  } catch (error) {
    console.error('Razorpay refund creation failed:', error);
    throw error;
  }
};

export const verifyPaymentSignature = (
  orderId: string,
  paymentId: string,
  signature: string
): boolean => {
  if (!RAZORPAY_KEY_SECRET) return false;
  
  const generatedSignature = crypto
    .createHmac('sha256', RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  // Use timingSafeEqual to prevent timing attacks
  if (generatedSignature.length !== signature.length) return false;
  
  return crypto.timingSafeEqual(
    Buffer.from(generatedSignature),
    Buffer.from(signature)
  );
};

export const verifyWebhookSignature = (
  payload: string | Buffer,
  signature: string,
  secret: string
): boolean => {
  const generatedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  if (generatedSignature.length !== signature.length) return false;
  return crypto.timingSafeEqual(
    Buffer.from(generatedSignature),
    Buffer.from(signature)
  );
};
