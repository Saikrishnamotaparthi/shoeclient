import { adminAuth } from '../config/firebase';

export const setAdminClaim = async (uid: string, isAdmin: boolean = true) => {
  try {
    await adminAuth.setCustomUserClaims(uid, { admin: isAdmin });
    console.log(`Successfully set admin claim to ${isAdmin} for user ${uid}`);
    return true;
  } catch (error) {
    console.error('Error setting custom claim:', error);
    return false;
  }
};
