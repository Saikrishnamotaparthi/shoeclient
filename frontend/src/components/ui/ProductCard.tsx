import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { Product } from '../../types';
import { useWishlistStore } from '../../store/wishlistStore';
import { useAuth } from '../../contexts/AuthContext';

interface ProductCardProps {
  product: Product;
  showWishlistToggle?: boolean;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  showWishlistToggle = true,
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const wishlistItems = useWishlistStore((state) => state.items);
  const addToWishlist = useWishlistStore((state) => state.addToWishlist);
  const removeFromWishlist = useWishlistStore((state) => state.removeFromWishlist);

  const isSaved = wishlistItems.some((item) => item.id === product.id);
  const [isToggling, setIsToggling] = useState(false);

  const handleWishlistClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      // Redirect to login
      navigate('/login');
      return;
    }

    setIsToggling(true);
    try {
      if (isSaved) {
        await removeFromWishlist(product.id);
      } else {
        await addToWishlist(product);
      }
    } catch (err) {
      console.error('Error toggling wishlist item:', err);
    } finally {
      setIsToggling(false);
    }
  };

  const hasBadge = product.badges && product.badges.length > 0;
  const totalStock = product.sizes?.reduce((sum, s) => sum + (s.stock || 0), 0) || 0;
  const isOutOfStock = totalStock === 0;

  // Determine display status
  const getStatusBadge = () => {
    if (product.productStatus === 'COMING_SOON') return { text: 'Coming Soon', color: 'bg-violet-600' };
    if (product.productStatus === 'RESTOCKING_SOON') return { text: 'Restocking Soon', color: 'bg-amber-500' };
    if (product.productStatus === 'SOLD_OUT' || (!product.productStatus && isOutOfStock)) return { text: 'Sold Out', color: 'bg-red-600' };
    if (product.productStatus === 'INACTIVE' || !product.isActive) return { text: 'Unavailable', color: 'bg-gray-600' };
    return null;
  };
  const statusBadge = getStatusBadge();

  return (
    <div className="group relative flex flex-col h-full bg-white rounded-lg border border-border overflow-hidden transition-all duration-300 hover:shadow-md">
      {/* Product Image and Overlay Controls */}
      <Link to={`/shop/${product.slug}`} className="relative aspect-square w-full overflow-hidden bg-[#F0F0F0] block">
        <img
          src={product.images?.[0] || 'https://via.placeholder.com/400x400?text=No+Image'}
          alt={product.name}
          loading="lazy"
          className="h-full w-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
        />

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1">
          {statusBadge && (
            <span className={`${statusBadge.color} text-white text-[10px] tracking-wider font-bold px-2.5 py-1 uppercase rounded-sm shadow-sm`}>
              {statusBadge.text}
            </span>
          )}
          {!statusBadge && hasBadge && (
            <span className="bg-primary text-white text-[10px] tracking-wider font-bold px-2.5 py-1 uppercase rounded-sm shadow-sm">
              {product.badges[0]}
            </span>
          )}
          {!statusBadge && product.isNewArrival && (
            <span className="bg-emerald-600 text-white text-[10px] tracking-wider font-bold px-2.5 py-1 uppercase rounded-sm shadow-sm">
              New
            </span>
          )}
        </div>

        {/* Wishlist Button */}
        {showWishlistToggle && product.isActive && product.productStatus !== 'COMING_SOON' && product.productStatus !== 'SOLD_OUT' && (
          <button
            onClick={handleWishlistClick}
            disabled={isToggling}
            aria-label={isSaved ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
            className={`absolute top-3 right-3 p-2.5 rounded-full shadow-md backdrop-blur-sm transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary ${
              isSaved
                ? 'bg-primary text-white scale-110'
                : 'bg-white/80 text-text hover:bg-white hover:text-primary'
            }`}
          >
            <svg
              className={`w-5 h-5 transition-transform duration-300 ${isToggling ? 'animate-ping' : ''}`}
              fill={isSaved ? 'currentColor' : 'none'}
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth="2"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </button>
        )}
      </Link>

      {/* Product Details */}
      <div className="flex flex-col flex-1 p-4">
        <Link to={`/shop/${product.slug}`} className="focus:outline-none focus:underline block">
          <h3 className="font-medium text-text text-base line-clamp-1 group-hover:text-primary transition-colors">
            {product.name}
          </h3>
          <p className="text-text-muted text-sm mt-0.5">{product.brand}</p>
        </Link>

        {/* Rating and Price */}
        <div className="mt-auto pt-3 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {product.ratings?.count > 0 ? (
              <>
                <div className="flex items-center text-amber-500">
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <span className="text-xs font-semibold text-text mt-0.5">{product.ratings.average.toFixed(1)}</span>
                </div>
                <span className="text-xs text-text-muted">({product.ratings.count})</span>
              </>
            ) : (
              <span className="text-xs text-text-muted">No reviews yet</span>
            )}
          </div>

          <div className="flex items-baseline gap-1.5">
            {product.salePrice && product.salePrice < product.price ? (
              <>
                <span className="font-semibold text-primary text-base">
                  ₹{product.salePrice.toLocaleString('en-IN')}
                </span>
                <span className="text-xs text-text-muted line-through">
                  ₹{product.price.toLocaleString('en-IN')}
                </span>
                <span className="text-xs text-green-600 font-medium">
                  {Math.round(((product.price - product.salePrice) / product.price) * 100)}% off
                </span>
              </>
            ) : (
              <span className="font-semibold text-text text-base">
                ₹{product.price.toLocaleString('en-IN')}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
