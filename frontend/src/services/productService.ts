import type { Product } from '@/types';
import api from './api';

export interface GetProductsParams {
  category?: string;
  brand?: string;
  collection?: string;
  size?: string;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
  page?: number;
  limit?: number;
  sort?: string;
  isActive?: boolean;
  isFeatured?: boolean;
  isNewArrival?: boolean;
  inStock?: boolean;
}

export interface PaginatedProducts {
  products: Product[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const getProducts = async (params?: GetProductsParams): Promise<PaginatedProducts> => {
  const query = new URLSearchParams();
  
  if (params) {
    if (params.category) query.append('category', params.category);
    if (params.brand) query.append('brand', params.brand);
    if (params.collection) query.append('collection', params.collection);
    if (params.size) query.append('size', params.size);
    if (params.minPrice !== undefined) query.append('minPrice', params.minPrice.toString());
    if (params.maxPrice !== undefined) query.append('maxPrice', params.maxPrice.toString());
    if (params.search) query.append('search', params.search);
    if (params.page) query.append('page', params.page.toString());
    if (params.limit) query.append('limit', params.limit.toString());
    if (params.sort) query.append('sort', params.sort);
    if (params.isActive !== undefined) query.append('isActive', params.isActive.toString());
    if (params.isFeatured !== undefined) query.append('isFeatured', params.isFeatured.toString());
    if (params.isNewArrival !== undefined) query.append('isNewArrival', params.isNewArrival.toString());
    if (params.inStock !== undefined) query.append('inStock', params.inStock.toString());
  }
  
  const response = await api.get(`/products?${query.toString()}`);
  return response.data;
};

export const getProduct = async (slug: string): Promise<Product> => {
  try {
    const response = await api.get(`/products/${slug}`);
    return response.data;
  } catch (err: any) {
    if (err.response?.status === 404) {
      throw new Error('Product not found');
    }
    throw new Error('Failed to fetch product');
  }
};

export const getRelatedProducts = async (slug: string, limit: number = 4): Promise<Product[]> => {
  // Try to fetch products (we would ideally fetch based on category)
  // For now, we'll fetch general active products and filter out the current one
  try {
    const data = await getProducts({ limit: limit + 1 });
    return data.products.filter(p => p.slug !== slug).slice(0, limit);
  } catch (err) {
    console.error('Error fetching related products', err);
    return [];
  }
};
