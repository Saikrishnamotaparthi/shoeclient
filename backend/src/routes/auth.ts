import { Router } from 'express';
import { syncProfile, updateProfile } from '../controllers/auth';
import { verifyIdToken } from '../middleware/verifyIdToken';
import { authRateLimiter } from '../middleware/rateLimiter';

const router = Router();

// Apply auth specific rate limiter to these endpoints
router.use(authRateLimiter);

router.post('/profile', verifyIdToken, syncProfile);
router.put('/profile', verifyIdToken, updateProfile);
// set-admin should NOT be exposed publicly. This route will be removed or tightly restricted in production.
// For now, removing it so users cannot promote themselves.
// router.post('/set-admin', setAdminClaim);

export default router;
