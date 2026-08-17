import api from './api';
import type { Product } from '../types';

export const wishlistService = {
  getWishlist: async (): Promise<Product[]> => {
    const response = await api.get('/wishlist');
    return response.data;
  },

  addToWishlist: async (productId: string): Promise<{ message: string; productId: string }> => {
    const response = await api.post(`/wishlist/${productId}`);
    return response.data;
  },

  removeFromWishlist: async (productId: string): Promise<{ message: string; productId: string }> => {
    const response = await api.delete(`/wishlist/${productId}`);
    return response.data;
  },
};
