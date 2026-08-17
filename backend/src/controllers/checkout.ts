import { Request, Response } from 'express';
import { validateCart, CheckoutValidationRequest } from '../services/checkout';
import { adminDb } from '../config/firebase';
import axios from 'axios';

export const validateCheckout = async (req: Request, res: Response) => {
  try {
    const { items, couponCode, shippingAddressId } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Cart is empty or invalid format' });
    }

    const requestData: CheckoutValidationRequest = {
      items,
      couponCode,
      shippingAddressId
    };

    const result = await validateCart(requestData);

    res.status(200).json(result);
  } catch (error: any) {
    console.error('Checkout validation error:', error);
    res.status(400).json({ error: error.message || 'Failed to validate checkout' });
  }
};

// ─── Shiprocket token cache ───────────────────────────────────────────────────
let shiprocketToken: string | null = null;
let shiprocketTokenExpiry: number | null = null;

async function getShiprocketToken(): Promise<string | null> {
  if (shiprocketToken && shiprocketTokenExpiry && Date.now() < shiprocketTokenExpiry) {
    return shiprocketToken;
  }
  const email = process.env.SHIPROCKET_EMAIL;
  const password = process.env.SHIPROCKET_PASSWORD;
  if (!email || !password) return null;

  try {
    const res = await axios.post('https://apiv2.shiprocket.in/v1/external/auth/login', {
      email,
      password,
    });
    shiprocketToken = res.data.token;
    shiprocketTokenExpiry = Date.now() + 9 * 24 * 60 * 60 * 1000;
    return shiprocketToken;
  } catch {
    return null;
  }
}

// ─── COD Availability Check ───────────────────────────────────────────────────
export const checkCodAvailability = async (req: Request, res: Response) => {
  const pincode = String(req.query.pincode || '').trim();
  const orderAmount = Number(req.query.amount || 0);

  if (!/^\d{6}$/.test(pincode)) {
    return res.status(400).json({ available: false, reason: 'Invalid pincode' });
  }

  try {
    // 1. Read COD settings from Firestore
    const settingsSnap = await adminDb.collection('settings').doc('cod').get();
    const settings = settingsSnap.exists
      ? settingsSnap.data()!
      : { enabled: true, minAmount: 0, maxAmount: 10000, blockedPincodes: [] };

    if (!settings.enabled) {
      return res.json({ available: false, reason: 'Cash on Delivery is currently not available' });
    }

    const blocked: string[] = settings.blockedPincodes || [];
    if (blocked.includes(pincode)) {
      return res.json({ available: false, reason: `COD is not available for pincode ${pincode}` });
    }

    if (orderAmount > 0 && settings.minAmount > 0 && orderAmount < settings.minAmount) {
      return res.json({
        available: false,
        reason: `COD requires a minimum order of ₹${settings.minAmount.toLocaleString('en-IN')}`,
      });
    }

    if (orderAmount > 0 && settings.maxAmount > 0 && orderAmount > settings.maxAmount) {
      return res.json({
        available: false,
        reason: `COD is not available for orders above ₹${settings.maxAmount.toLocaleString('en-IN')}`,
      });
    }

    // 2. Check Shiprocket serviceability
    const storeDoc = await adminDb.collection('settings').doc('store').get();
    const storeData = storeDoc.exists ? storeDoc.data() : {};
    const pickupPincode = storeData?.warehousePincode || process.env.WAREHOUSE_PINCODE || '500001';
    const token = await getShiprocketToken();

    if (token) {
      try {
        const srRes = await axios.get(
          'https://apiv2.shiprocket.in/v1/external/courier/serviceability',
          {
            headers: { Authorization: `Bearer ${token}` },
            params: {
              pickup_postcode: pickupPincode,
              delivery_postcode: pincode,
              weight: 0.5,
              cod: 1,
            },
            timeout: 6000,
          }
        );

        const couriers: any[] = srRes.data?.data?.available_courier_companies || [];
        const codAvailable = couriers.some((c: any) => c.cod === 1 || c.cod === true);

        if (!codAvailable && couriers.length > 0) {
          return res.json({
            available: false,
            reason: `COD is not serviceable for pincode ${pincode}`,
          });
        }
      } catch (srErr) {
        // Shiprocket check failed — fail closed (safer default)
        console.warn('Shiprocket serviceability check failed, defaulting to unavailable:', srErr);
        return res.json({ available: false, reason: 'Unable to verify COD availability. Please try again.' });
      }
    }

    return res.json({ available: true });
  } catch (error: any) {
    console.error('checkCodAvailability error:', error);
    // Fail closed — safer default
    return res.json({ available: false, reason: 'Unable to verify COD availability. Please try again.' });
  }
};
