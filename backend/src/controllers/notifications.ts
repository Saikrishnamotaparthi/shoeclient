import { Response } from 'express';
import { adminDb } from '../config/firebase';
import { AuthenticatedRequest } from '../types/auth';

export const getNotifications = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.uid;
    const limit = parseInt(req.query.limit as string) || 50;

    const snapshot = await adminDb
      .collection('users')
      .doc(userId)
      .collection('notifications')
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    const notifications = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
};

export const markAsRead = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.uid;
    const notificationId = req.params.id as string;

    const notificationRef = adminDb
      .collection('users')
      .doc(userId)
      .collection('notifications')
      .doc(notificationId);

    const doc = await notificationRef.get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    await notificationRef.update({ read: true });

    res.json({ message: 'Marked as read' });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
};

export const markAllAsRead = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.uid;

    const snapshot = await adminDb
      .collection('users')
      .doc(userId)
      .collection('notifications')
      .where('read', '==', false)
      .get();

    const batch = adminDb.batch();
    snapshot.docs.forEach((doc) => {
      batch.update(doc.ref, { read: true });
    });

    await batch.commit();

    res.json({ message: 'All marked as read' });
  } catch (error) {
    console.error('Error marking all as read:', error);
    res.status(500).json({ error: 'Failed to mark all as read' });
  }
};
