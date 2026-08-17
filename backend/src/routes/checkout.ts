import { Router } from 'express';
import { validateCheckout, checkCodAvailability } from '../controllers/checkout';
import { verifyIdToken } from '../middleware/verifyIdToken';

const router = Router();

// Validate checkout cart, coupons, and return authoritative summary
router.post('/validate', verifyIdToken, validateCheckout);

// Check COD availability for a pincode (public, no auth required)
router.get('/cod-check', checkCodAvailability);

export default router;
