import { Request, Response } from 'express';
import { adminDb as db } from '../config/firebase';
import { Review, Order } from '../types';
import { AuthenticatedRequest } from '../types/auth';

export const getReviewsForProduct = async (req: Request, res: Response) => {
  try {
    const productId = req.params.productId as string;
    
    // Pagination params
    const limit = parseInt(req.query.limit as string) || 10;
    
    // Fetch only approved reviews
    const snapshot = await db.collection('reviews')
      .where('productId', '==', productId)
      .where('status', '==', 'APPROVED')
      .get();
      
    const reviews: Review[] = [];
    snapshot.forEach((doc: any) => {
      reviews.push({ id: doc.id, ...doc.data() } as Review);
    });
    
    // Sort in memory to avoid Firestore composite index requirement
    reviews.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    // Apply limit after sorting
    const paginatedReviews = reviews.slice(0, limit);
    
    res.json(paginatedReviews);
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
};

export const createReview = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const productId = req.params.productId as string;
    const { rating, title, body } = req.body;
    
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const customerId = req.user.uid;
    const customerName = req.user.name || req.user.email?.split('@')[0] || 'Customer';
    
    // 1. Validation
    if (!rating || typeof rating !== 'number' || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Invalid rating. Must be 1-5.' });
    }
    
    if (!title || title.trim().length === 0 || title.length > 100) {
      return res.status(400).json({ error: 'Invalid title. Max 100 characters.' });
    }
    
    if (!body || body.trim().length === 0 || body.length > 1000) {
      return res.status(400).json({ error: 'Invalid review body. Max 1000 characters.' });
    }
    
    // 2. Verify Purchase (DELIVERED order containing productId)
    const ordersSnapshot = await db.collection('orders')
      .where('customerId', '==', customerId)
      .where('status', '==', 'DELIVERED')
      .get();
      
    let qualifyingOrderId: string | null = null;
    
    for (const doc of ordersSnapshot.docs) {
      const order = doc.data() as Order;
      const hasProduct = order.items.some(item => item.productId === productId);
      if (hasProduct) {
        qualifyingOrderId = order.id;
        break; // Found a qualifying order
      }
    }
    
    if (!qualifyingOrderId) {
      return res.status(403).json({ error: 'You must have a delivered order for this product to leave a review.' });
    }
    
    // 3. Duplicate Review Protection
    const existingReviewsSnapshot = await db.collection('reviews')
      .where('productId', '==', productId)
      .where('customerId', '==', customerId)
      .where('orderId', '==', qualifyingOrderId)
      .get();
      
    if (!existingReviewsSnapshot.empty) {
      return res.status(400).json({ error: 'You have already reviewed this product from this order.' });
    }
    
    // 4. Create Review
    const newReviewRef = db.collection('reviews').doc();
    
    const reviewData: Omit<Review, 'id'> = {
      productId,
      customerId,
      customerName,
      rating,
      title: title.trim(),
      body: body.trim(),
      orderId: qualifyingOrderId,
      verifiedPurchase: true,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    await newReviewRef.set(reviewData);
    
    res.status(201).json({ id: newReviewRef.id, ...reviewData });
    
  } catch (error) {
    console.error('Error creating review:', error);
    res.status(500).json({ error: 'Failed to submit review' });
  }
};

export const reportReview = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const reviewId = req.params.reviewId as string;
    const { reason } = req.body;
    
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({ error: 'Report reason is required' });
    }
    
    const reporterId = req.user.uid;
    
    // Check duplicate reports
    const existingReportSnapshot = await db.collection('reviewReports')
      .where('reviewId', '==', reviewId)
      .where('reporterId', '==', reporterId)
      .get();
      
    if (!existingReportSnapshot.empty) {
      return res.status(400).json({ error: 'You have already reported this review.' });
    }
    
    const reportRef = db.collection('reviewReports').doc();
    
    await reportRef.set({
      reviewId,
      reporterId,
      reason: reason.trim(),
      status: 'PENDING',
      createdAt: new Date().toISOString()
    });
    
    res.status(201).json({ message: 'Report submitted successfully' });
    
  } catch (error) {
    console.error('Error reporting review:', error);
    res.status(500).json({ error: 'Failed to report review' });
  }
};
