import { Response } from 'express';
import { adminDb as db } from '../config/firebase';
import { AuthenticatedRequest } from '../types/auth';

export const getWishlist = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.uid;
    const limit = parseInt(req.query.limit as string) || 50;

    const snapshot = await db
      .collection('users')
      .doc(userId)
      .collection('wishlist')
      .orderBy('addedAt', 'desc')
      .limit(limit)
      .get();

    const wishlistItems: any[] = [];
    
    // Using Promise.all to fetch full product details for each wishlist item in parallel
    await Promise.all(
      snapshot.docs.map(async (doc) => {
        const productId = doc.id;
        const productDoc = await db.collection('products').doc(productId).get();
        if (productDoc.exists) {
          const productData = productDoc.data();
          wishlistItems.push({
            ...productData,
            id: productDoc.id,
            addedAt: doc.data().addedAt
          });
        }
      })
    );

    // Sort again in memory by addedAt desc (since Promise.all might return out of order)
    wishlistItems.sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime());

    res.json(wishlistItems);
  } catch (error) {
    console.error('Error fetching wishlist:', error);
    res.status(500).json({ error: 'Failed to fetch wishlist' });
  }
};

export const addToWishlist = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.uid;
    const productId = req.params.productId as string;

    // Validate product exists and is active
    const productDoc = await db.collection('products').doc(productId).get();
    if (!productDoc.exists) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const productData = productDoc.data();
    if (productData?.isActive === false) {
      return res.status(400).json({ error: 'Cannot add inactive product to wishlist' });
    }

    const wishlistRef = db.collection('users').doc(userId).collection('wishlist').doc(productId);
    
    await wishlistRef.set({
      productId,
      addedAt: new Date().toISOString()
    });

    res.status(201).json({ message: 'Added to wishlist', productId });
  } catch (error) {
    console.error('Error adding to wishlist:', error);
    res.status(500).json({ error: 'Failed to add to wishlist' });
  }
};

export const removeFromWishlist = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.uid;
    const productId = req.params.productId as string;

    const wishlistRef = db.collection('users').doc(userId).collection('wishlist').doc(productId);
    await wishlistRef.delete();

    res.json({ message: 'Removed from wishlist', productId });
  } catch (error) {
    console.error('Error removing from wishlist:', error);
    res.status(500).json({ error: 'Failed to remove from wishlist' });
  }
};
