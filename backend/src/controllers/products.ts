import { Request, Response } from 'express';
import * as productService from '../services/product';



export const getProducts = async (req: Request, res: Response) => {
  try {
    const { category, search, page, limit, sort, isActive, isFeatured } = req.query;
    
    // Since search might be an array if multiple queries are provided, we ensure it's a string
    const searchString = Array.isArray(search) ? (search[0] as string) : (search as string);
    const categoryString = Array.isArray(category) ? (category[0] as string) : (category as string);
    const sortString = Array.isArray(sort) ? (sort[0] as string) : (sort as string);
    
    const pageNum = page ? parseInt(page as string, 10) : 1;
    const limitNum = limit ? parseInt(limit as string, 10) : 20;

    let activeFilter = isActive;
    // Default to active only for public endpoints
    if (!req.path.includes('/admin') && activeFilter === undefined) {
      activeFilter = 'true';
    }

    const result = await productService.getProducts({
      category: categoryString,
      search: searchString,
      page: pageNum,
      limit: limitNum,
      sort: sortString,
      isActive: activeFilter as string,
      isFeatured: isFeatured as string
    });
    res.json(result);
  } catch (error) {
    console.error('getProducts error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getProduct = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    let product = await productService.getProductBySlug(slug as string);
    
    if (!product) {
      // Check if it's a product ID
      const doc = await require('../config/firebase').adminDb.collection('products').doc(slug as string).get();
      if (doc.exists) {
        product = doc.data() as any;
      }
    }
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    res.json(product);
  } catch (error) {
    console.error('getProduct error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Public endpoint — returns categories, brands & sizes for storefront filters
export const getCatalogSettings = async (_req: Request, res: Response) => {
  try {
    const { adminDb } = require('../config/firebase');
    const snap = await adminDb.collection('settings').doc('catalog').get();
    const data = snap.exists ? snap.data() : {};
    res.json({
      categories: data.categories || [],
      brands: data.brands || [],
      sizes: data.sizes || [],
    });
  } catch (error) {
    console.error('getCatalogSettings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
