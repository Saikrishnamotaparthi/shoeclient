import { Request, Response } from 'express';
import { adminDb, adminAuth } from '../config/firebase';
import { AuthenticatedRequest } from '../types/auth';

export const syncProfile = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const uid = req.user!.uid;
    const { email, name, phone, dob } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const userRef = adminDb.collection('users').doc(uid);
    const doc = await userRef.get();

    if (!doc.exists) {
      // Create new user profile
      const newUser = {
        id: uid,
        email,
        name,
        phone: phone || null,
        dob: dob || null,
        isAdmin: false,
        createdAt: new Date().toISOString()
      };
      await userRef.set(newUser);
      return res.status(201).json(newUser);
    } else {
      // Update existing profile (e.g. after Google login)
      await userRef.update({ lastLogin: new Date().toISOString() });
      return res.status(200).json(doc.data());
    }
  } catch (error) {
    console.error('syncProfile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateProfile = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const uid = req.user!.uid;
    const { name, phone } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const userRef = adminDb.collection('users').doc(uid);
    const doc = await userRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    // Only allow updating safe fields
    const updates: any = {
      name,
      updatedAt: new Date().toISOString(),
    };
    if (phone !== undefined) {
      updates.phone = phone || null;
    }

    await userRef.update(updates);

    const updatedDoc = await userRef.get();
    res.json(updatedDoc.data());
  } catch (error) {
    console.error('updateProfile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// setAdminClaim REMOVED — security risk. Use Firebase CLI or admin SDK scripts to set admin claims.
