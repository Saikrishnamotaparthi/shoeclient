import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCartStore } from '@/store/cartStore';
import Button from '@/components/ui/Button';

const CartDrawer = () => {
  const { 
    items, 
    isDrawerOpen, 
    setDrawerOpen, 
    removeItem, 
    updateQuantity, 
    getSubtotal, 
    getTotal,
    discountAmount
  } = useCartStore();
  
  const navigate = useNavigate();

  // Close drawer on escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawerOpen(false);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [setDrawerOpen]);

  if (!isDrawerOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity animate-fade-in"
        onClick={() => setDrawerOpen(false)}
      />
      
      {/* Drawer */}
      <div className="relative w-full max-w-md bg-surface h-full flex flex-col shadow-2xl animate-[slide-in-right_0.3s_ease-out]">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-display font-semibold">Your Cart ({items.length})</h2>
          <button 
            onClick={() => setDrawerOpen(false)}
            className="p-2 hover:bg-black/5 rounded-full transition-colors"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-text-muted">
              <p className="mb-4">Your cart is empty.</p>
              <Button onClick={() => setDrawerOpen(false)}>Continue Shopping</Button>
            </div>
          ) : (
            <div className="space-y-6">
              {items.map((item) => (
                <div key={`${item.productId}-${item.size}`} className="flex gap-4">
                  <div className="w-24 h-24 bg-[#F0F0F0] flex-shrink-0">
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 flex flex-col">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold">{item.name}</h4>
                        <p className="text-sm text-text-muted mt-1">Size: {item.size}</p>
                      </div>
                      <button 
                        onClick={() => removeItem(item.productId, item.size)}
                        className="text-text-muted hover:text-danger text-sm underline"
                      >
                        Remove
                      </button>
                    </div>
                    
                    <div className="mt-auto flex justify-between items-center">
                      <div className="flex items-center border border-border">
                        <button 
                          className="px-3 py-1 hover:bg-black/5"
                          onClick={() => updateQuantity(item.productId, item.size, item.quantity - 1)}
                        >
                          -
                        </button>
                        <span className="px-3 py-1 text-sm">{item.quantity}</span>
                        <button 
                          className="px-3 py-1 hover:bg-black/5"
                          onClick={() => updateQuantity(item.productId, item.size, item.quantity + 1)}
                        >
                          +
                        </button>
                      </div>
                      <span className="font-medium">₹{(item.price * item.quantity).toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div className="p-6 border-t border-border bg-white/50">
            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-text-muted">
                <span>Subtotal</span>
                <span>₹{getSubtotal().toLocaleString('en-IN')}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-success">
                  <span>Discount</span>
                  <span>−₹{discountAmount.toLocaleString('en-IN')}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold text-lg pt-3 border-t border-border">
                <span>Total</span>
                <span>₹{getTotal().toLocaleString('en-IN')}</span>
              </div>
              <p className="text-xs text-text-muted">Shipping calculated at checkout. All prices are GST-inclusive.</p>
            </div>
            
            <Button 
              fullWidth 
              size="lg" 
              onClick={() => {
                setDrawerOpen(false);
                navigate('/checkout');
              }}
            >
              Checkout
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CartDrawer;
