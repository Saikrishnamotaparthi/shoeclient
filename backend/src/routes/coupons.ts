import { Router } from 'express';
import { validateCoupon } from '../controllers/coupons';
import { verifyIdToken } from '../middleware/verifyIdToken';
import { authRateLimiter } from '../middleware/rateLimiter';

const router = Router();

router.post('/validate', verifyIdToken, authRateLimiter, validateCoupon);

export default router;
