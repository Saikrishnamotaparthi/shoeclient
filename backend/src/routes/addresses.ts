import { Router } from 'express';
import { getAddresses, addAddress, updateAddress, deleteAddress, setDefaultAddress } from '../controllers/addresses';
import { verifyIdToken } from '../middleware/verifyIdToken';

const router = Router();

router.use(verifyIdToken);

router.get('/', getAddresses);
router.post('/', addAddress);
router.put('/:addressId', updateAddress);
router.delete('/:addressId', deleteAddress);
router.put('/:addressId/default', setDefaultAddress);

export default router;
