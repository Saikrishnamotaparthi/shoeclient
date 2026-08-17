import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import type { Product } from '@/types';
import Button from '@/components/ui/Button';
import { useCartStore } from '@/store/cartStore';
import ProductReviews from './ProductReviews';
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed';
import { RecentlyViewed } from '@/components/ui/RecentlyViewed';
import { useWishlistStore } from '@/store/wishlistStore';
import { useAuth } from '@/contexts/AuthContext';
import { getProduct, getRelatedProducts } from '@/services/productService';
import { ProductCard } from '@/components/ui/ProductCard';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { Heart, ShoppingBag, Share2, Shield, Truck, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react';

const ProductDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [selectedSize, setSelectedSize] = useState('');
  const [activeImage, setActiveImage] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addedToCart, setAddedToCart] = useState(false);
  const [isWishlisting, setIsWishlisting] = useState(false);

  const addItem = useCartStore(state => state.addItem);
  const wishlistItems = useWishlistStore(state => state.items);
  const addToWishlist = useWishlistStore(state => state.addToWishlist);
  const removeFromWishlist = useWishlistStore(state => state.removeFromWishlist);
  const isSaved = wishlistItems.some(item => item.id === product?.id);
  const { addToRecentlyViewed } = useRecentlyViewed();

  useEffect(() => {
    if (!slug) return;
    setIsLoading(true);
    setSelectedSize('');
    setActiveImage(0);
    getProduct(slug)
      .then(data => {
        setProduct(data);
        setError(null);
        addToRecentlyViewed(data.id);
        // Load related products
        getRelatedProducts(slug, 4).then(setRelated).catch(() => {});
      })
      .catch(err => setError(err.message))
      .finally(() => setIsLoading(false));
  }, [slug, addToRecentlyViewed]);

  const isPurchasable = product?.isActive && !['COMING_SOON', 'SOLD_OUT', 'INACTIVE', 'RESTOCKING_SOON'].includes(product.productStatus || '') && (product.sizes?.filter(s => s.stock > 0).length || 0) > 0;

  const handleAddToCart = () => {
    if (!product) return;
    if (!isPurchasable) return;
    if (!selectedSize) { setError('Please select a size before adding to cart.'); return; }
    setError(null);
    addItem({
      productId: product.id,
      name: product.name,
      price: product.salePrice || product.price,
      image: product.images?.[0] || '',
      size: selectedSize,
      quantity: 1,
    });
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2000);
  };

  const handleBuyNow = () => {
    if (!product) return;
    if (!isPurchasable) return;
    if (!selectedSize) { setError('Please select a size before buying.'); return; }
    if (!user) { navigate('/login'); return; }
    setError(null);
    addItem({
      productId: product.id,
      name: product.name,
      price: product.salePrice || product.price,
      image: product.images?.[0] || '',
      size: selectedSize,
      quantity: 1,
    });
    navigate('/checkout');
  };

  const handleWishlist = async () => {
    if (!user) { navigate('/login'); return; }
    if (!product) return;
    setIsWishlisting(true);
    try {
      isSaved ? await removeFromWishlist(product.id) : await addToWishlist(product);
    } finally {
      setIsWishlisting(false);
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: product?.name, url: window.location.href });
    } else {
      navigator.clipboard.writeText(window.location.href);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid md:grid-cols-2 gap-12">
          <div className="aspect-square bg-surface rounded-xl animate-pulse" />
          <div className="space-y-4 pt-10">
            <div className="h-4 bg-surface w-24 rounded animate-pulse" />
            <div className="h-10 bg-surface w-3/4 rounded animate-pulse" />
            <div className="h-8 bg-surface w-32 rounded animate-pulse" />
            <div className="h-24 bg-surface rounded animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center text-center px-4">
        <h2 className="text-2xl font-semibold mb-3">Product Not Found</h2>
        <p className="text-text-muted mb-6">This product doesn't exist or has been removed.</p>
        <Button onClick={() => navigate('/shop')} variant="outline">Browse All Products</Button>
      </div>
    );
  }

  const images = product.images?.length ? product.images : ['/placeholder-shoe.jpg'];
  const hasDiscount = (product.discountPrice || product.salePrice) && (product.discountPrice || product.salePrice)! < product.price;
  const effectivePrice = product.salePrice || product.discountPrice || product.price;
  const discountPct = hasDiscount
    ? Math.round(((product.price - effectivePrice) / product.price) * 100)
    : 0;
  const displayPrice = effectivePrice;
  const inStockSizes = product.sizes?.filter(s => s.stock > 0) || [];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 animate-fade-in">
      <Breadcrumb
        items={[
          { label: 'Shop', to: '/shop' },
          ...(product.category ? [{ label: product.category, to: `/shop?category=${product.category}` }] : []),
          { label: product.name },
        ]}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 lg:gap-16 mt-6">
        {/* ── Image Gallery ── */}
        <div className="space-y-3">
          {/* Main image */}
          <div className="relative aspect-square bg-surface rounded-xl overflow-hidden group">
            <img
              src={images[activeImage]}
              alt={`${product.name} – view ${activeImage + 1}`}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            {hasDiscount && (
              <span className="absolute top-3 left-3 bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
                -{discountPct}%
              </span>
            )}
            {(product.productStatus === 'COMING_SOON' || product.productStatus === 'SOLD_OUT' || product.productStatus === 'INACTIVE' || (!product.isActive && !product.productStatus)) && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <span className="text-white font-semibold text-lg">
                  {product.productStatus === 'COMING_SOON' ? 'Coming Soon' :
                   product.productStatus === 'SOLD_OUT' ? 'Sold Out' :
                   product.productStatus === 'RESTOCKING_SOON' ? 'Restocking Soon' :
                   'Unavailable'}
                </span>
              </div>
            )}
            {/* Prev/Next on multi-image */}
            {images.length > 1 && (
              <>
                <button
                  onClick={() => setActiveImage(i => Math.max(0, i - 1))}
                  disabled={activeImage === 0}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/80 rounded-full flex items-center justify-center shadow disabled:opacity-30 hover:bg-white transition-colors"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={() => setActiveImage(i => Math.min(images.length - 1, i + 1))}
                  disabled={activeImage === images.length - 1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/80 rounded-full flex items-center justify-center shadow disabled:opacity-30 hover:bg-white transition-colors"
                >
                  <ChevronRight size={16} />
                </button>
              </>
            )}
          </div>
          {/* Thumbnail strip */}
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImage(idx)}
                  className={`w-16 h-16 rounded-lg overflow-hidden border-2 shrink-0 transition-colors ${
                    activeImage === idx ? 'border-primary' : 'border-transparent hover:border-border'
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Product Info ── */}
        <div className="flex flex-col pt-2">
          {/* Brand + share */}
          <div className="flex items-center justify-between mb-2">
            <Link
              to={`/shop?brand=${encodeURIComponent(product.brand || '')}`}
              className="text-sm text-text-muted uppercase tracking-widest hover:text-primary transition-colors"
            >
              {product.brand}
            </Link>
            <button
              onClick={handleShare}
              aria-label="Share product"
              className="w-8 h-8 flex items-center justify-center border border-border rounded-full hover:border-primary hover:text-primary transition-colors"
            >
              <Share2 size={14} />
            </button>
          </div>

          <h1 className="text-3xl md:text-4xl font-display font-semibold mb-2 leading-tight">
            {product.name}
          </h1>

          {/* Product Status Badge */}
          {(product.productStatus === 'COMING_SOON' || product.productStatus === 'RESTOCKING_SOON' || product.productStatus === 'SOLD_OUT') && (
            <div className="mb-4">
              <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full ${
                product.productStatus === 'COMING_SOON' ? 'bg-violet-100 text-violet-700' :
                product.productStatus === 'RESTOCKING_SOON' ? 'bg-amber-100 text-amber-700' :
                'bg-red-100 text-red-700'
              }`}>
                {product.productStatus === 'COMING_SOON' && '🚀 '}
                {product.productStatus === 'RESTOCKING_SOON' && '🔄 '}
                {product.productStatus === 'SOLD_OUT' && ' '}
                {product.productStatus === 'COMING_SOON' ? 'Coming Soon' :
                 product.productStatus === 'RESTOCKING_SOON' ? 'Restocking Soon' :
                 'Sold Out'}
              </span>
            </div>
          )}

          {/* Price */}
          <div className="flex items-baseline gap-3 mb-6">
            <span className="text-2xl font-bold">
              ₹{displayPrice.toLocaleString('en-IN')}
            </span>
            {hasDiscount && (
              <>
                <span className="text-lg text-text-muted line-through">
                  ₹{product.price.toLocaleString('en-IN')}
                </span>
                <span className="text-sm font-semibold text-red-500">{discountPct}% off</span>
              </>
            )}
          </div>

          <p className="text-text-muted leading-relaxed mb-6 text-sm">{product.description}</p>

          {/* Size selector */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-3">
              <span className="font-semibold text-sm uppercase tracking-wider">
                Size (UK) {selectedSize && <span className="text-primary ml-1">{selectedSize}</span>}
              </span>
              <button className="text-xs text-text-muted underline hover:text-primary transition-colors">
                Size Guide
              </button>
            </div>
            {product.sizes && product.sizes.length > 0 ? (
              <div className="grid grid-cols-4 gap-2">
                {product.sizes.map(sizeObj => {
                  const oos = sizeObj.stock === 0;
                  return (
                    <button
                      key={sizeObj.size}
                      disabled={oos}
                      onClick={() => setSelectedSize(sizeObj.size)}
                      title={oos ? 'Out of stock' : `Size ${sizeObj.size}`}
                      className={`h-11 border rounded text-sm font-medium transition-all relative
                        ${oos ? 'opacity-30 cursor-not-allowed line-through text-text-muted' : 'hover:border-primary'}
                        ${selectedSize === sizeObj.size
                          ? 'border-primary bg-primary text-white'
                          : 'border-border'
                        }
                      `}
                    >
                      {sizeObj.size}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-text-muted">No sizes available</p>
            )}
            {inStockSizes.length <= 3 && inStockSizes.length > 0 && (
              <p className="text-xs text-amber-600 mt-2 font-medium">
                ⚠ Only {inStockSizes.length} size{inStockSizes.length > 1 ? 's' : ''} left!
              </p>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
              {error}
            </div>
          )}

          {/* CTA buttons */}
          {(() => {
            const statusMessage = product.productStatus === 'COMING_SOON' ? 'Coming Soon — Not Available Yet'
              : product.productStatus === 'SOLD_OUT' ? 'Sold Out'
              : product.productStatus === 'RESTOCKING_SOON' ? 'Restocking Soon — Check Back Later'
              : product.productStatus === 'INACTIVE' ? 'Currently Unavailable'
              : inStockSizes.length === 0 ? 'Out of Stock' : null;

            return (
              <>
                {statusMessage && (
                  <div className="mb-3 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-600 text-center font-medium">
                    {statusMessage}
                  </div>
                )}
                <div className="flex gap-3 mb-6">
                  <button
                    onClick={handleAddToCart}
                    disabled={!isPurchasable || !selectedSize}
                    className={`flex-1 flex items-center justify-center gap-2 h-12 rounded font-semibold text-sm transition-all ${
                      addedToCart
                        ? 'bg-green-500 text-white'
                        : 'bg-primary text-white hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed'
                    }`}
                  >
                    <ShoppingBag size={17} />
                    {addedToCart ? '✓ Added to Cart!' : !isPurchasable ? 'Unavailable' : selectedSize ? 'Add to Cart' : 'Select a Size'}
                  </button>
                  <button
                    onClick={handleBuyNow}
                    disabled={!isPurchasable || !selectedSize}
                    className="flex-1 flex items-center justify-center gap-2 h-12 rounded font-semibold text-sm bg-black text-white hover:bg-black/80 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
              Buy Now
            </button>
            <button
              onClick={handleWishlist}
              disabled={isWishlisting}
              aria-label={isSaved ? 'Remove from wishlist' : 'Add to wishlist'}
              className={`h-12 w-12 flex items-center justify-center border rounded transition-all ${
                isSaved
                  ? 'bg-red-50 border-red-300 text-red-500'
                  : 'border-border hover:border-red-300 hover:text-red-400'
              }`}
            >
              <Heart size={20} fill={isSaved ? 'currentColor' : 'none'} />
            </button>
                </div>
              </>
            );
          })()}

          {/* Trust badges */}
          <div className="grid grid-cols-3 gap-2 mb-6">
            {[
              { icon: Shield, label: '100% Authentic' },
              { icon: Truck, label: 'Free Shipping ₹999+' },
              { icon: RotateCcw, label: '7-Day Returns' },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex flex-col items-center gap-1 text-center py-3 px-2 bg-surface rounded-lg">
                <Icon size={16} className="text-primary" />
                <span className="text-xs text-text-muted leading-tight">{label}</span>
              </div>
            ))}
          </div>

          {/* Accordion details */}
          <div className="space-y-1 border-t border-border pt-4">
            {[
              {
                label: 'Product Details',
                content: product.description || 'Premium materials, excellent craftsmanship. Genuine leather upper with cushioned insole for all-day comfort.',
              },
              {
                label: 'Shipping & Delivery',
                content: 'Free shipping on orders above ₹999. Standard delivery in 3–5 business days across India. Express delivery (1–2 days) available in select cities.',
              },
              {
                label: 'Returns & Exchanges',
                content: 'Easy 7-day returns on unworn items in original packaging. Log in to your account and go to My Orders to initiate a return.',
              },
            ].map(({ label, content }) => (
              <details key={label} className="group">
                <summary className="flex justify-between items-center py-3 font-semibold cursor-pointer list-none text-sm hover:text-primary transition-colors">
                  {label}
                  <ChevronRight size={16} className="transition-transform group-open:rotate-90 shrink-0" />
                </summary>
                <p className="text-sm text-text-muted leading-relaxed pb-4 pr-4">{content}</p>
              </details>
            ))}
          </div>
        </div>
      </div>

      {/* Reviews */}
      <div className="mt-16">
        <ProductReviews product={product} />
      </div>

      {/* Related Products */}
      {related.length > 0 && (
        <section className="mt-16">
          <h2 className="text-2xl font-display font-semibold mb-6">You May Also Like</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {related.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}

      {/* Recently Viewed */}
      <RecentlyViewed />
    </div>
  );
};

export default ProductDetailPage;
