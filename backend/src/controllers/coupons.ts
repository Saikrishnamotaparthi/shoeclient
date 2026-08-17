import { Request, Response } from 'express';
import { adminDb } from '../config/firebase';

export const validateCoupon = async (req: Request, res: Response) => {
  try {
    const { code, cartSubtotal } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Coupon code is required' });
    }

    const snapshot = await adminDb.collection('coupons')
      .where('code', '==', code.toUpperCase())
      .where('isActive', '==', true)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return res.status(404).json({ error: 'Invalid or expired coupon' });
    }

    const coupon = snapshot.docs[0].data();

    // Check expiration
    if (coupon.validUntil && new Date(coupon.validUntil) < new Date()) {
      return res.status(400).json({ error: 'Coupon has expired' });
    }

    // Check min purchase
    if (coupon.minPurchaseAmount && cartSubtotal < coupon.minPurchaseAmount) {
      return res.status(400).json({ error: `Minimum purchase of $${coupon.minPurchaseAmount} required` });
    }

    // Calculate discount
    let discountAmount = 0;
    if (coupon.discountType === 'percentage') {
      discountAmount = (cartSubtotal * coupon.discountValue) / 100;
      if (coupon.maxDiscountAmount && discountAmount > coupon.maxDiscountAmount) {
        discountAmount = coupon.maxDiscountAmount;
      }
    } else {
      discountAmount = coupon.discountValue;
    }

    res.json({
      code: coupon.code,
      discountAmount,
      message: 'Coupon applied successfully'
    });
  } catch (error) {
    console.error('validateCoupon error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
