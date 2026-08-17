import { create } from 'zustand';
import type { Product } from '../types';
import { wishlistService } from '../services/wishlistService';

interface WishlistState {
  items: Product[];
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchWishlist: () => Promise<void>;
  addToWishlist: (product: Product) => Promise<void>;
  removeFromWishlist: (productId: string) => Promise<void>;
  clearWishlist: () => void;
}

export const useWishlistStore = create<WishlistState>((set, get) => ({
  items: [],
  isLoading: false,
  error: null,

  fetchWishlist: async () => {
    set({ isLoading: true, error: null });
    try {
      const items = await wishlistService.getWishlist();
      set({ items, isLoading: false });
    } catch (err: any) {
      console.error('Failed to fetch wishlist:', err);
      set({ error: err.response?.data?.error || 'Failed to load wishlist', isLoading: false });
    }
  },

  addToWishlist: async (product: Product) => {
    // Optimistic update
    const previousItems = get().items;
    if (previousItems.some((item) => item.id === product.id)) return;

    set({ items: [product, ...previousItems] });

    try {
      await wishlistService.addToWishlist(product.id);
    } catch (err: any) {
      console.error('Failed to add to wishlist:', err);
      // Revert on failure
      set({ items: previousItems, error: err.response?.data?.error || 'Failed to add to wishlist' });
      throw err;
    }
  },

  removeFromWishlist: async (productId: string) => {
    // Optimistic update
    const previousItems = get().items;
    set({ items: previousItems.filter((item) => item.id !== productId) });

    try {
      await wishlistService.removeFromWishlist(productId);
    } catch (err: any) {
      console.error('Failed to remove from wishlist:', err);
      // Revert on failure
      set({ items: previousItems, error: err.response?.data?.error || 'Failed to remove from wishlist' });
      throw err;
    }
  },

  clearWishlist: () => {
    set({ items: [], error: null, isLoading: false });
  },
}));
