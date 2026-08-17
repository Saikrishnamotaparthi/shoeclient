import { Response } from 'express';
import { adminDb } from '../config/firebase';
import { AuthenticatedRequest } from '../types/auth';
import { Address } from '../types';
import { randomUUID } from 'crypto';

export const getAddresses = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.uid;
    const userDoc = await adminDb.collection('users').doc(userId).get();
    if (!userDoc.exists) return res.status(404).json({ error: 'User not found' });
    const addresses = userDoc.data()?.addresses || [];
    res.json(addresses);
  } catch (error) {
    console.error('getAddresses error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const addAddress = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.uid;
    const { fullName, phone, street, landmark, city, state, pincode, addressType, isDefault } = req.body;

    if (!fullName || !phone || !street || !city || !state || !pincode) {
      return res.status(400).json({ error: 'Missing required address fields' });
    }

    const newAddress: Address = {
      id: randomUUID(),
      fullName: String(fullName).trim(),
      phone: String(phone).trim(),
      street: String(street).trim(),
      landmark: landmark ? String(landmark).trim() : undefined,
      city: String(city).trim(),
      state: String(state).trim(),
      pincode: String(pincode).trim(),
      isDefault: Boolean(isDefault),
    };

    const userRef = adminDb.collection('users').doc(userId);
    const userDoc = await userRef.get();
    if (!userDoc.exists) return res.status(404).json({ error: 'User not found' });

    const addresses: Address[] = userDoc.data()?.addresses || [];

    // If this is the first address or isDefault, unset other defaults
    if (newAddress.isDefault || addresses.length === 0) {
      addresses.forEach(a => a.isDefault = false);
      newAddress.isDefault = true;
    }

    addresses.push(newAddress);
    await userRef.update({ addresses });

    res.status(201).json(newAddress);
  } catch (error) {
    console.error('addAddress error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateAddress = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.uid;
    const addressId = String(req.params.addressId);
    const { fullName, phone, street, landmark, city, state, pincode, addressType, isDefault } = req.body;

    const userRef = adminDb.collection('users').doc(userId);
    const userDoc = await userRef.get();
    if (!userDoc.exists) return res.status(404).json({ error: 'User not found' });

    const addresses: Address[] = userDoc.data()?.addresses || [];
    const idx = addresses.findIndex(a => a.id === addressId);
    if (idx === -1) return res.status(404).json({ error: 'Address not found' });

    // Update fields
    if (fullName !== undefined) addresses[idx].fullName = String(fullName).trim();
    if (phone !== undefined) addresses[idx].phone = String(phone).trim();
    if (street !== undefined) addresses[idx].street = String(street).trim();
    if (landmark !== undefined) addresses[idx].landmark = String(landmark).trim();
    if (city !== undefined) addresses[idx].city = String(city).trim();
    if (state !== undefined) addresses[idx].state = String(state).trim();
    if (pincode !== undefined) addresses[idx].pincode = String(pincode).trim();

    if (isDefault) {
      addresses.forEach(a => a.isDefault = false);
      addresses[idx].isDefault = true;
    }

    await userRef.update({ addresses });
    res.json(addresses[idx]);
  } catch (error) {
    console.error('updateAddress error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteAddress = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.uid;
    const addressId = String(req.params.addressId);

    const userRef = adminDb.collection('users').doc(userId);
    const userDoc = await userRef.get();
    if (!userDoc.exists) return res.status(404).json({ error: 'User not found' });

    const addresses: Address[] = userDoc.data()?.addresses || [];
    const filtered = addresses.filter(a => a.id !== addressId);
    if (filtered.length === addresses.length) return res.status(404).json({ error: 'Address not found' });

    // If deleted address was default, make first remaining address default
    if (filtered.length > 0 && !filtered.some(a => a.isDefault)) {
      filtered[0].isDefault = true;
    }

    await userRef.update({ addresses: filtered });
    res.json({ success: true });
  } catch (error) {
    console.error('deleteAddress error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const setDefaultAddress = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.uid;
    const addressId = String(req.params.addressId);

    const userRef = adminDb.collection('users').doc(userId);
    const userDoc = await userRef.get();
    if (!userDoc.exists) return res.status(404).json({ error: 'User not found' });

    const addresses: Address[] = userDoc.data()?.addresses || [];
    const idx = addresses.findIndex(a => a.id === addressId);
    if (idx === -1) return res.status(404).json({ error: 'Address not found' });

    addresses.forEach(a => a.isDefault = false);
    addresses[idx].isDefault = true;

    await userRef.update({ addresses });
    res.json(addresses[idx]);
  } catch (error) {
    console.error('setDefaultAddress error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
