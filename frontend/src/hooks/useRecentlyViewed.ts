import { useState, useEffect, useCallback } from 'react';
import type { Product } from '../types';
import { getProduct } from '../services/productService';

const LOCAL_STORAGE_KEY = 'recently_viewed_products';
export const MAX_RECENTLY_VIEWED = 12;

interface RecentlyViewedItem {
  productId: string;
  viewedAt: string;
}

export const useRecentlyViewed = () => {
  const [recentlyViewedIds, setRecentlyViewedIds] = useState<string[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Load IDs from localStorage
  const loadIds = useCallback(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        const items: RecentlyViewedItem[] = JSON.parse(stored);
        // Sort newest first
        const sorted = items
          .sort((a, b) => new Date(b.viewedAt).getTime() - new Date(a.viewedAt).getTime())
          .map((item) => item.productId);
        setRecentlyViewedIds(sorted.slice(0, MAX_RECENTLY_VIEWED));
      }
    } catch (err) {
      console.error('Error loading recently viewed IDs:', err);
    }
  }, []);

  useEffect(() => {
    loadIds();
  }, [loadIds]);

  // Load products based on IDs
  useEffect(() => {
    if (recentlyViewedIds.length === 0) {
      setProducts([]);
      return;
    }

    const fetchProducts = async () => {
      setLoading(true);
      setError(null);
      try {
        const fetchedProducts: Product[] = [];
        // Fetch products in parallel
        await Promise.all(
          recentlyViewedIds.map(async (id) => {
            try {
              const product = await getProduct(id);
              if (product && product.isActive) {
                fetchedProducts.push(product);
              }
            } catch {
              // Stale ID (deleted product), clean from localStorage silently
              try {
                const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
                if (stored) {
                  const items: RecentlyViewedItem[] = JSON.parse(stored);
                  const filtered = items.filter(item => item.productId !== id);
                  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filtered));
                }
              } catch {
                // Ignore storage errors
              }
            }
          })
        );

        // Keep the sorting order of recentlyViewedIds
        const orderedProducts = recentlyViewedIds
          .map((id) => fetchedProducts.find((p) => p.id === id))
          .filter((p): p is Product => !!p);

        setProducts(orderedProducts);
      } catch (err) {
        console.error('Error fetching recently viewed products:', err);
        setError('Failed to load recently viewed products');
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [recentlyViewedIds]);

  const addToRecentlyViewed = useCallback((productId: string) => {
    if (!productId) return;
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      let items: RecentlyViewedItem[] = stored ? JSON.parse(stored) : [];

      // Filter out if duplicate, then add to top
      items = items.filter((item) => item.productId !== productId);
      items.push({
        productId,
        viewedAt: new Date().toISOString(),
      });

      // Keep only up to limit
      items.sort((a, b) => new Date(b.viewedAt).getTime() - new Date(a.viewedAt).getTime());
      const limited = items.slice(0, MAX_RECENTLY_VIEWED);

      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(limited));
      setRecentlyViewedIds(limited.map((item) => item.productId));
    } catch (err) {
      console.error('Error saving recently viewed product:', err);
    }
  }, []);

  return {
    recentlyViewedIds,
    products,
    loading,
    error,
    addToRecentlyViewed,
  };
};
