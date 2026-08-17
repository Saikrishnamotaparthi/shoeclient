import { Router } from 'express';
import { createOrder, verifyPayment, getOrders, getOrderById, cancelOrder, requestReturn } from '../controllers/orders';
import { getTracking } from '../controllers/shipping';
import { verifyIdToken } from '../middleware/verifyIdToken';

const router = Router();

// Orders should only be accessible by authenticated users
router.use(verifyIdToken);

router.get('/', getOrders);
router.post('/', createOrder);
router.post('/verify-payment', verifyPayment);
router.get('/:id', getOrderById);
router.get('/:orderId/tracking', getTracking);
router.post('/:id/cancel', cancelOrder);
router.post('/:id/return', requestReturn);

export default router;
