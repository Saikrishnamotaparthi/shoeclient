import { Router } from 'express';
import { getReviewsForProduct, createReview, reportReview } from '../controllers/reviews';
import { verifyIdToken } from '../middleware/verifyIdToken';

const router = Router();

// Get reviews for a product (public)
// E.g., /api/products/:productId/reviews
router.get('/products/:productId/reviews', getReviewsForProduct);

// Create a review (authenticated)
router.post('/products/:productId/reviews', verifyIdToken, createReview);

// Report a review (authenticated)
// E.g., /api/reviews/:reviewId/report
router.post('/reviews/:reviewId/report', verifyIdToken, reportReview);

export default router;
