import { Router } from 'express';
import { verifyIdToken } from '../middleware/verifyIdToken';
import { getNotifications, markAsRead, markAllAsRead } from '../controllers/notifications';

const router = Router();

// All notification routes require authentication
router.use(verifyIdToken);

router.get('/', getNotifications);
router.patch('/read-all', markAllAsRead);
router.patch('/:id/read', markAsRead);

export default router;
