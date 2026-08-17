import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCartStore } from '@/store/cartStore';
import { useAuth } from '@/contexts/AuthContext';
import { ShoppingBag, Minus, Plus, Trash2, Tag, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';
import api from '@/services/api';

interface ProductStatus {
  productId: string;
  productStatus?: string;
  isActive: boolean;
  sizes: { size: string; stock: number }[];
}

const CartPage: React.FC = () => {
  const { items, removeItem, updateQuantity, getSubtotal, getTotal, discountAmount, applyCoupon, removeCoupon, couponCode } = useCartStore();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [couponInput, setCouponInput] = useState(couponCode || '');
  const [couponError, setCouponError] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [productStatuses, setProductStatuses] = useState<Map<string, ProductStatus>>(new Map());
  const [checkingStatus, setCheckingStatus] = useState(true);

  const subtotal = getSubtotal();
  const total = getTotal();
  const shipping = total > 999 ? 0 : 79;

  // Fetch product statuses to check availability
  const checkProductAvailability = useCallback(async () => {
    if (items.length === 0) { setCheckingStatus(false); return; }
    setCheckingStatus(true);
    try {
      const productIds = [...new Set(items.map(i => i.productId))];
      const results = await Promise.all(
        productIds.map(async (id) => {
          try {
            const res = await api.get(`/products/${id}`);
            const p = res.data;
            return {
              productId: id,
              productStatus: p.productStatus,
              isActive: p.isActive !== false,
              sizes: p.sizes || [],
            } as ProductStatus;
          } catch {
            return { productId: id, productStatus: 'INACTIVE', isActive: false, sizes: [] } as ProductStatus;
          }
        })
      );
      const map = new Map<string, ProductStatus>();
      results.forEach(r => map.set(r.productId, r));
      setProductStatuses(map);
    } catch {
      // fail silently — cart still works
    } finally {
      setCheckingStatus(false);
    }
  }, [items]);

  useEffect(() => { checkProductAvailability(); }, [checkProductAvailability]);

  // Check if an item is unavailable
  const getItemStatus = (productId: string, size: string) => {
    const product = productStatuses.get(productId);
    if (!product) return null;
    if (!product.isActive || product.productStatus === 'INACTIVE') return { type: 'error', message: 'Unavailable' };
    if (product.productStatus === 'COMING_SOON') return { type: 'error', message: 'Coming Soon' };
    if (product.productStatus === 'SOLD_OUT') return { type: 'error', message: 'Sold Out' };
    if (product.productStatus === 'RESTOCKING_SOON') return { type: 'warning', message: 'Restocking Soon' };
    // Check size-level stock
    const sizeData = product.sizes.find(s => s.size === size);
    if (sizeData && sizeData.stock === 0) return { type: 'error', message: 'Out of Stock' };
    if (sizeData && sizeData.stock < 5) return { type: 'warning', message: `Only ${sizeData.stock} left` };
    return null;
  };

  const hasUnavailableItems = items.some(item => {
    const status = getItemStatus(item.productId, item.size);
    return status?.type === 'error';
  });

  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) return;
    setCouponError('');
    setCouponLoading(true);
    try {
      const res = await api.post('/checkout/validate-coupon', {
        code: couponInput.trim().toUpperCase(),
        subtotal,
      });
      applyCoupon(couponInput.trim().toUpperCase(), res.data.discount);
      setCouponError('');
    } catch (err: any) {
      setCouponError(err.response?.data?.error || 'Invalid or expired coupon code.');
      removeCoupon();
    } finally {
      setCouponLoading(false);
    }
  };

  const handleCheckout = () => {
    if (!user) {
      navigate('/login?redirect=/checkout');
      return;
    }
    navigate('/checkout');
  };

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="w-20 h-20 bg-surface rounded-full flex items-center justify-center mx-auto mb-6">
          <ShoppingBag size={36} className="text-border" />
        </div>
        <h1 className="text-2xl font-display font-semibold mb-3">Your cart is empty</h1>
        <p className="text-text-muted mb-8">Looks like you haven't added anything yet.</p>
        <Link
          to="/shop"
          className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded font-semibold hover:bg-primary/90 transition-colors"
        >
          Browse Products <ArrowRight size={16} />
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-display font-semibold mb-6">
        Shopping Cart ({items.reduce((t, i) => t + i.quantity, 0)} items)
      </h1>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Cart items */}
        <div className="flex-1 space-y-4">
          {items.map(item => {
            const itemStatus = getItemStatus(item.productId, item.size);
            const isBlocked = itemStatus?.type === 'error';
            return (
              <div key={`${item.productId}-${item.size}`} className={`flex gap-4 bg-white border rounded-xl p-4 transition-colors ${isBlocked ? 'border-red-200 bg-red-50/30' : 'border-border'}`}>
                {/* Image */}
                <div className="w-24 h-24 bg-surface rounded-lg overflow-hidden shrink-0 relative">
                  <img
                    src={item.image}
                    alt={item.name}
                    className={`w-full h-full object-cover ${isBlocked ? 'opacity-50' : ''}`}
                    onError={e => (e.currentTarget.style.display = 'none')}
                  />
                  {isBlocked && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded">{itemStatus.message}</span>
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold line-clamp-1">{item.name}</p>
                      <p className="text-xs text-text-muted mt-0.5">Size: {item.size}</p>
                      {/* Status badge */}
                      {itemStatus && (
                        <span className={`inline-flex items-center gap-1 mt-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full ${
                          itemStatus.type === 'error'
                            ? 'bg-red-100 text-red-700 border border-red-200'
                            : 'bg-amber-100 text-amber-700 border border-amber-200'
                        }`}>
                          <AlertCircle size={10} />
                          {itemStatus.message}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => removeItem(item.productId, item.size)}
                      className="p-1.5 text-text-muted hover:text-danger transition-colors shrink-0"
                      aria-label="Remove item"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between mt-3">
                    {/* Quantity */}
                    <div className={`flex items-center gap-2 border rounded-lg ${isBlocked ? 'border-red-200 opacity-50 pointer-events-none' : 'border-border'}`}>
                      <button
                        onClick={() => updateQuantity(item.productId, item.size, Math.max(1, item.quantity - 1))}
                        className="p-1.5 hover:bg-surface rounded-l-lg transition-colors"
                        aria-label="Decrease quantity"
                        disabled={isBlocked}
                      >
                        <Minus size={14} />
                      </button>
                      <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.productId, item.size, item.quantity + 1)}
                        className="p-1.5 hover:bg-surface rounded-r-lg transition-colors"
                        aria-label="Increase quantity"
                        disabled={isBlocked}
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                    {/* Price */}
                    <div className="text-right">
                      <p className={`font-semibold text-sm ${isBlocked ? 'text-text-muted line-through' : ''}`}>₹{(item.price * item.quantity).toLocaleString('en-IN')}</p>
                      {item.quantity > 1 && (
                        <p className="text-xs text-text-muted">₹{item.price.toLocaleString('en-IN')} each</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Order summary */}
        <div className="lg:w-80 shrink-0">
          <div className="bg-white border border-border rounded-xl overflow-hidden sticky top-20">
            <div className="px-5 py-4 border-b border-border">
              <h2 className="font-semibold">Order Summary</h2>
            </div>

            <div className="p-5 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-text-muted">Subtotal</span>
                <span>₹{subtotal.toLocaleString('en-IN')}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Coupon ({couponCode})</span>
                  <span>−₹{discountAmount.toLocaleString('en-IN')}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-text-muted">Shipping</span>
                <span className={shipping === 0 ? 'text-green-600 font-medium' : ''}>
                  {shipping === 0 ? 'FREE' : `₹${shipping}`}
                </span>
              </div>
              {shipping > 0 && (
                <p className="text-xs text-text-muted">Free shipping on orders above ₹999</p>
              )}
              <div className="flex justify-between font-semibold border-t border-border pt-3 text-base">
                <span>Total</span>
                <span>₹{(total + shipping - discountAmount).toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* Coupon */}
            <div className="px-5 pb-5">
              {couponCode ? (
                <div className="flex items-center justify-between text-sm bg-green-50 border border-green-200 rounded px-3 py-2">
                  <span className="flex items-center gap-2 text-green-700">
                    <Tag size={13} /> {couponCode} applied
                  </span>
                  <button onClick={() => { removeCoupon(); setCouponInput(''); }} className="text-green-600 hover:underline text-xs">Remove</button>
                </div>
              ) : (
                <div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={couponInput}
                      onChange={e => setCouponInput(e.target.value.toUpperCase())}
                      placeholder="Coupon code"
                      className="flex-1 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-primary"
                    />
                    <button
                      onClick={handleApplyCoupon}
                      disabled={couponLoading || !couponInput.trim()}
                      className="px-3 py-2 bg-primary text-white rounded text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
                    >
                      {couponLoading ? '…' : 'Apply'}
                    </button>
                  </div>
                  {couponError && <p className="text-xs text-danger mt-1">{couponError}</p>}
                </div>
              )}
            </div>

            {/* Checkout */}
            <div className="px-5 pb-5">
              {hasUnavailableItems && (
                <div className="mb-3 p-3 bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg flex items-start gap-2">
                  <AlertCircle size={14} className="mt-0.5 shrink-0" />
                  <span>Some items are unavailable. Please remove them to continue.</span>
                </div>
              )}
              {checkingStatus && (
                <div className="mb-3 p-2 bg-blue-50 border border-blue-200 text-blue-600 text-xs rounded-lg flex items-center gap-2">
                  <Loader2 size={12} className="animate-spin" />
                  <span>Checking availability...</span>
                </div>
              )}
              <button
                onClick={handleCheckout}
                disabled={hasUnavailableItems || checkingStatus}
                className="w-full flex items-center justify-center gap-2 py-3 bg-primary text-white rounded font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {user ? 'Proceed to Checkout' : 'Sign In to Checkout'}
                <ArrowRight size={16} />
              </button>
              <Link to="/shop" className="block text-center text-sm text-text-muted hover:text-primary mt-3 transition-colors">
                ← Continue Shopping
              </Link>
            </div>

            {/* Trust badges */}
            <div className="px-5 py-4 border-t border-border bg-surface flex justify-around text-xs text-text-muted">
              <span className="flex items-center gap-1">🔒 Secure</span>
              <span className="flex items-center gap-1">📦 Free Returns</span>
              <span className="flex items-center gap-1">✅ Authentic</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartPage;
