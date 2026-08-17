import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { orderService } from '@/services/orderService';
import type { Order } from '@/types';
import { CheckCircle, Package, MapPin, ArrowRight, ShoppingBag } from 'lucide-react';

const OrderConfirmationPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId) return;
    orderService.getOrder(orderId)
      .then(setOrder)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [orderId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-12 text-center">
      {/* Success icon */}
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <CheckCircle size={40} className="text-green-500" />
      </div>

      <h1 className="text-3xl font-display font-semibold mb-3">Order Confirmed! 🎉</h1>
      <p className="text-text-muted mb-2">
        Thank you for your order. We'll get it ready for delivery soon.
      </p>
      <p className="text-sm font-semibold text-primary mb-10">
        Order #{orderId?.slice(-8).toUpperCase()}
      </p>

      {/* Order summary card */}
      {order && (
        <div className="bg-white border border-border rounded-xl text-left mb-6 overflow-hidden">
          {/* Items */}
          <div className="px-5 py-4 border-b border-border">
            <p className="text-sm font-semibold mb-3">Your Items</p>
            {order.items?.map((item, idx) => (
              <div key={idx} className="flex items-center gap-3 mb-3 last:mb-0">
                <div className="w-12 h-12 bg-surface rounded overflow-hidden shrink-0">
                  <img src={item.image} alt={item.name} className="w-full h-full object-cover" onError={e => (e.currentTarget.style.display = 'none')} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.name}</p>
                  <p className="text-xs text-text-muted">Size: {item.size} · Qty: {item.quantity}</p>
                </div>
                <span className="text-sm font-semibold shrink-0">₹{(item.price * item.quantity).toLocaleString('en-IN')}</span>
              </div>
            ))}
          </div>

          {/* Price summary */}
          <div className="px-5 py-4 bg-surface space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-text-muted">Subtotal</span><span>₹{order.subtotal?.toLocaleString('en-IN')}</span></div>
            {order.discount > 0 && <div className="flex justify-between text-green-600"><span>Discount</span><span>−₹{order.discount?.toLocaleString('en-IN')}</span></div>}
            <div className="flex justify-between"><span className="text-text-muted">Shipping</span><span>{order.shippingFee === 0 ? 'Free' : `₹${order.shippingFee}`}</span></div>
            <div className="flex justify-between font-semibold border-t border-border pt-2 text-base">
              <span>Total Paid</span><span>₹{order.total?.toLocaleString('en-IN')}</span>
            </div>
          </div>

          {/* Delivery address */}
          {order.shippingAddress && (
            <div className="px-5 py-4 border-t border-border flex items-start gap-3 text-sm">
              <MapPin size={16} className="text-text-muted mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">{order.shippingAddress.fullName}</p>
                <p className="text-text-muted">
                  {order.shippingAddress.street}, {order.shippingAddress.city},{' '}
                  {order.shippingAddress.state} – {order.shippingAddress.pincode}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link
          to={`/account/orders/${orderId}`}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white rounded font-semibold text-sm hover:bg-primary/90 transition-colors"
        >
          <Package size={16} /> Track My Order
        </Link>
        <Link
          to="/shop"
          className="flex items-center justify-center gap-2 px-6 py-3 border border-border rounded font-semibold text-sm hover:bg-surface transition-colors"
        >
          <ShoppingBag size={16} /> Continue Shopping
        </Link>
      </div>

      <p className="text-xs text-text-muted mt-6">
        A confirmation email has been sent to your registered email address.
      </p>
    </div>
  );
};

export default OrderConfirmationPage;
