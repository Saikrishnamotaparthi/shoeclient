import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useWishlistStore } from '../../store/wishlistStore';
import { useCartStore } from '../../store/cartStore';
import Button from '../../components/ui/Button';

export const WishlistPage: React.FC = () => {
  const items = useWishlistStore((state) => state.items);
  const isLoading = useWishlistStore((state) => state.isLoading);
  const error = useWishlistStore((state) => state.error);
  const fetchWishlist = useWishlistStore((state) => state.fetchWishlist);
  const removeFromWishlist = useWishlistStore((state) => state.removeFromWishlist);
  const addItemToCart = useCartStore((state) => state.addItem);

  const [selectedSizes, setSelectedSizes] = useState<Record<string, string>>({});
  const [addingToCartId, setAddingToCartId] = useState<string | null>(null);

  useEffect(() => {
    fetchWishlist();
  }, [fetchWishlist]);

  const handleSizeChange = (productId: string, size: string) => {
    setSelectedSizes((prev) => ({
      ...prev,
      [productId]: size,
    }));
  };

  const handleAddToCart = async (productId: string) => {
    const product = items.find((item) => item.id === productId);
    if (!product) return;

    const selectedSize = selectedSizes[productId];
    if (!selectedSize) {
      alert('Please select a size first');
      return;
    }

    setAddingToCartId(productId);
    try {
      // Find the size to check availability
      const sizeObj = product.sizes?.find((s) => s.size === selectedSize);
      if (!sizeObj || sizeObj.stock <= 0) {
        alert('Selected size is out of stock');
        return;
      }

      addItemToCart({
        productId: product.id,
        name: product.name,
        price: product.discountPrice || product.price,
        image: product.images?.[0] || 'https://via.placeholder.com/800',
        size: selectedSize,
        quantity: 1,
      });

      alert('Product added to cart!');
    } catch (err) {
      console.error(err);
      alert('Failed to add product to cart');
    } finally {
      setAddingToCartId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 animate-pulse">
        <h1 className="text-3xl font-display mb-8">My Wishlist</h1>
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-surface w-full rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center">
        <h1 className="text-3xl font-display mb-4">My Wishlist</h1>
        <p className="text-red-600 mb-6">{error}</p>
        <Button onClick={() => fetchWishlist()}>Retry</Button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center animate-fade-in">
        <div className="max-w-md mx-auto">
          <svg className="w-16 h-16 mx-auto text-text-muted mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
          <h2 className="text-2xl font-display mb-3">Your wishlist is empty</h2>
          <p className="text-text-muted mb-8">Save items that you like to your wishlist so you can find them easily later.</p>
          <Link to="/shop">
            <Button variant="primary">Continue Shopping</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 animate-fade-in">
      <h1 className="text-3xl font-display mb-8">My Wishlist</h1>

      <div className="border border-border rounded-lg overflow-hidden bg-white shadow-sm">
        <div className="divide-y divide-border">
          {items.map((product) => {
            const isOutOfStock = !product.sizes || product.sizes.every((s) => s.stock === 0);
            const activeSizes = product.sizes?.filter((s) => s.stock > 0) || [];
            
            return (
              <div key={product.id} className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-4 flex-1">
                  {/* Image */}
                  <Link to={`/shop/${product.slug}`} className="w-20 h-20 bg-[#F0F0F0] rounded overflow-hidden flex-shrink-0">
                    <img
                      src={product.images?.[0] || 'https://via.placeholder.com/800'}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  </Link>

                  {/* Product Info */}
                  <div>
                    <Link to={`/shop/${product.slug}`} className="font-semibold text-lg hover:underline block">
                      {product.name}
                    </Link>
                    <p className="text-text-muted text-sm">{product.brand}</p>
                    
                    {/* Status & Ratings */}
                    <div className="flex flex-wrap items-center gap-3 mt-1.5">
                      {product.ratings?.count > 0 ? (
                        <div className="flex items-center text-amber-500 text-sm">
                          <svg className="w-4 h-4 fill-current mr-1" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                          <span className="font-medium text-text">{product.ratings.average.toFixed(1)}</span>
                          <span className="text-text-muted ml-1">({product.ratings.count})</span>
                        </div>
                      ) : (
                        <span className="text-xs text-text-muted">No reviews yet</span>
                      )}

                      {/* Stock availability */}
                      {!product.isActive ? (
                        <span className="text-xs font-semibold px-2 py-0.5 bg-gray-100 text-gray-700 rounded">
                          Product inactive
                        </span>
                      ) : isOutOfStock ? (
                        <span className="text-xs font-semibold px-2 py-0.5 bg-red-50 text-red-700 rounded">
                          Out of stock
                        </span>
                      ) : (
                        <span className="text-xs font-semibold px-2 py-0.5 bg-green-50 text-green-700 rounded">
                          In stock
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-4 w-full sm:w-auto justify-end">
                  {/* Price */}
                  <div className="text-right w-full sm:w-auto">
                    {product.discountPrice ? (
                      <div>
                        <span className="font-bold text-primary text-lg">${product.discountPrice}</span>
                        <span className="text-sm text-text-muted line-through ml-2">${product.price}</span>
                      </div>
                    ) : (
                      <span className="font-bold text-text text-lg">${product.price}</span>
                    )}
                  </div>

                  {/* Size Dropdown */}
                  {product.isActive && !isOutOfStock && (
                    <select
                      value={selectedSizes[product.id] || ''}
                      onChange={(e) => handleSizeChange(product.id, e.target.value)}
                      aria-label="Select size"
                      className="border border-border rounded px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary w-full sm:w-auto"
                    >
                      <option value="">Select Size</option>
                      {activeSizes.map((sizeObj) => (
                        <option key={sizeObj.size} value={sizeObj.size}>
                          US {sizeObj.size}
                        </option>
                      ))}
                    </select>
                  )}

                  {/* Add to Cart button */}
                  {product.isActive && !isOutOfStock ? (
                    <Button
                      variant="primary"
                      disabled={addingToCartId === product.id || !selectedSizes[product.id]}
                      onClick={() => handleAddToCart(product.id)}
                      className="w-full sm:w-auto"
                    >
                      Add to Cart
                    </Button>
                  ) : (
                    <Button variant="outline" disabled className="w-full sm:w-auto">
                      Unavailable
                    </Button>
                  )}

                  {/* Remove Button */}
                  <button
                    onClick={() => removeFromWishlist(product.id)}
                    aria-label="Remove from wishlist"
                    className="p-2 text-text-muted hover:text-red-600 transition-colors focus:outline-none"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
