import { Router } from 'express';
import { verifyIdToken } from '../middleware/verifyIdToken';
import { getWishlist, addToWishlist, removeFromWishlist } from '../controllers/wishlist';

const router = Router();

// All wishlist routes require authentication
router.use(verifyIdToken);

router.get('/', getWishlist);
router.post('/:productId', addToWishlist);
router.delete('/:productId', removeFromWishlist);

export default router;
