import { Router } from 'express';
import { getProducts, getProduct, getCatalogSettings } from '../controllers/products';

const router = Router();

router.get('/catalog-settings', getCatalogSettings);
router.get('/', getProducts);
router.get('/:slug', getProduct);

export default router;
