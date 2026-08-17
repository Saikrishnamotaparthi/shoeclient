import React from 'react';
import { useRecentlyViewed } from '../../hooks/useRecentlyViewed';
import { ProductCard } from './ProductCard';

export const RecentlyViewed: React.FC = () => {
  const { products, loading } = useRecentlyViewed();

  if (loading) {
    return (
      <div className="mt-16 animate-pulse">
        <h2 className="text-2xl font-display mb-6">Recently Viewed</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i}>
              <div className="bg-surface aspect-square w-full rounded-lg mb-3"></div>
              <div className="h-4 bg-surface w-2/3 rounded mb-2"></div>
              <div className="h-4 bg-surface w-1/3 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return null;
  }

  return (
    <div className="mt-16 border-t border-border pt-12 animate-fade-in">
      <h2 className="text-2xl font-display mb-6">Recently Viewed</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} showWishlistToggle={true} />
        ))}
      </div>
    </div>
  );
};
