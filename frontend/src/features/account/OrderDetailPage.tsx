import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { orderService } from '@/services/orderService';
import type { Order } from '@/types';
import { ArrowLeft, MapPin, Package, CreditCard, Clock, ExternalLink, ChevronRight, XCircle, AlertTriangle, X, Loader2 } from 'lucide-react';

const TIMELINE: { status: string; label: string }[] = [
  { status: 'PLACED', label: 'Order Placed' },
  { status: 'CONFIRMED', label: 'Payment Confirmed' },
  { status: 'PROCESSING', label: 'Processing' },
  { status: 'PACKED', label: 'Packed' },
  { status: 'SHIPMENT_CREATED', label: 'Shipment Created' },
  { status: 'SHIPPED', label: 'Shipped' },
  { status: 'OUT_FOR_DELIVERY', label: 'Out for Delivery' },
  { status: 'DELIVERED', label: 'Delivered' },
];

const STATUS_ORDER = TIMELINE.map(t => t.status);

const STATUS_COLORS: Record<string, string> = {
  PLACED: 'bg-gray-100 text-gray-700',
  CONFIRMED: 'bg-blue-100 text-blue-700',
  PROCESSING: 'bg-amber-100 text-amber-700',
  PACKED: 'bg-amber-100 text-amber-700',
  SHIPMENT_CREATED: 'bg-blue-100 text-blue-700',
  SHIPPED: 'bg-blue-100 text-blue-700',
  OUT_FOR_DELIVERY: 'bg-purple-100 text-purple-700',
  DELIVERED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-600',
  RETURNED: 'bg-orange-100 text-orange-700',
  REFUNDED: 'bg-green-100 text-green-700',
};

const OrderDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelError, setCancelError] = useState('');

  useEffect(() => {
    if (!id) return;
    orderService.getOrder(id)
      .then(setOrder)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  // Can cancel only before packing
  const canCancel = order && ['PLACED', 'CONFIRMED', 'PROCESSING'].includes(order.status);

  const handleCancel = async () => {
    if (!id || !cancelReason.trim()) return;
    setCancelling(true);
    setCancelError('');
    try {
      await orderService.cancelOrder(id, cancelReason.trim());
      const updated = await orderService.getOrder(id);
      setOrder(updated);
      setShowCancelModal(false);
      setCancelReason('');
    } catch (err: any) {
      setCancelError(err.response?.data?.error || 'Failed to cancel order. Please try again.');
    } finally {
      setCancelling(false);
    }
  };

  const statusIndex = order ? STATUS_ORDER.indexOf(order.status) : -1;

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => <div key={i} className="h-32 bg-surface rounded-xl animate-pulse" />)}
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-16">
        <p className="text-text-muted">Order not found.</p>
        <Link to="/account/orders" className="mt-4 inline-block text-primary hover:underline text-sm">← Back to orders</Link>
      </div>
    );
  }

  const addr = order.shippingAddress;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <Link to="/account/orders" className="flex items-center gap-1 text-sm text-text-muted hover:text-primary mb-3 transition-colors">
          <ArrowLeft size={16} /> All Orders
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-display font-semibold">
              Order #{order.id.slice(-8).toUpperCase()}
            </h1>
            <p className="text-sm text-text-muted mt-0.5">
              Placed on {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-sm px-3 py-1 rounded-full font-medium ${STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-700'}`}>
              {order.status.replace(/_/g, ' ')}
            </span>
            {canCancel && (
              <button
                onClick={() => setShowCancelModal(true)}
                className="text-sm px-3 py-1.5 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
              >
                Cancel Order
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Cancel reason banner */}
      {order.status === 'CANCELLED' && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <XCircle size={18} className="text-red-500 mt-0.5 shrink-0" />
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-red-800">Order Cancelled</p>
              {(order as any).cancelledBy && (
                <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                  (order as any).cancelledBy === 'admin' ? 'bg-purple-100 text-purple-600' : 'bg-orange-100 text-orange-600'
                }`}>
                  {(order as any).cancelledBy === 'admin' ? 'by Store' : 'by You'}
                </span>
              )}
            </div>
            {(order as any).cancelReason && (
              <p className="text-sm text-red-600 mt-0.5">Reason: {(order as any).cancelReason}</p>
            )}
          </div>
        </div>
      )}

      {/* Timeline */}
      {order.status !== 'CANCELLED' && (
        <div className="bg-white border border-border rounded-xl p-5">
          <h2 className="text-sm font-semibold mb-4">Order Status</h2>
          <div className="flex items-center justify-between overflow-x-auto gap-1">
            {TIMELINE.map((step, i) => {
              const isActive = i <= statusIndex;
              const isCurrent = i === statusIndex;
              return (
                <React.Fragment key={step.status}>
                  <div className="flex flex-col items-center min-w-[60px]">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                      isCurrent ? 'bg-primary text-white' :
                      isActive ? 'bg-green-100 text-green-700' :
                      'bg-gray-100 text-gray-400'
                    }`}>
                      {isActive ? '✓' : i + 1}
                    </div>
                    <p className={`text-[10px] mt-1.5 text-center font-medium ${isActive ? 'text-gray-700' : 'text-gray-400'}`}>
                      {step.label}
                    </p>
                  </div>
                  {i < TIMELINE.length - 1 && (
                    <div className={`flex-1 h-0.5 min-w-[20px] mt-[-16px] ${i < statusIndex ? 'bg-green-300' : 'bg-gray-200'}`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      )}

      {/* Items */}
      <div className="bg-white border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-border bg-surface">
          <h2 className="text-sm font-semibold">Items</h2>
        </div>
        <div className="divide-y divide-border">
          {order.items.map((item: any, i: number) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4">
              <img src={item.image || 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2248%22 height=%2248%22 fill=%22%23e5e7eb%22%3E%3Crect width=%2248%22 height=%2248%22 rx=%224%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 font-size=%2210%22 fill=%22%239ca3af%22%3Eimg%3C/text%3E%3C/svg%3E'} alt={item.name} className="w-14 h-14 object-cover rounded-lg" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.name}</p>
                <p className="text-xs text-text-muted">Size: {item.size} · Qty: {item.quantity}</p>
              </div>
              <p className="text-sm font-semibold">₹{Number(item.price * item.quantity).toLocaleString('en-IN')}</p>
            </div>
          ))}
        </div>
        <div className="px-5 py-3 bg-surface border-t border-border">
          <div className="flex justify-between text-sm">
            <span className="text-text-muted">Subtotal</span>
            <span>₹{Number(order.subtotal || 0).toLocaleString('en-IN')}</span>
          </div>
          {(order.discount || 0) > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>Discount</span>
              <span>-₹{Number(order.discount).toLocaleString('en-IN')}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-text-muted">Shipping</span>
            <span>{(order.shippingFee || 0) === 0 ? 'Free' : `₹${order.shippingFee}`}</span>
          </div>
          <div className="flex justify-between text-sm font-bold mt-2 pt-2 border-t border-border">
            <span>Total</span>
            <span>₹{Number(order.total || 0).toLocaleString('en-IN')}</span>
          </div>
        </div>
      </div>

      {/* Payment & Shipping */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><CreditCard size={14} /> Payment</h3>
          <div className="space-y-1 text-sm">
            <p><span className="text-text-muted">Method:</span> {order.paymentMethod || 'Razorpay'}</p>
            <p><span className="text-text-muted">Status:</span> <span className={order.paymentStatus === 'captured' ? 'text-green-600' : 'text-amber-600'}>{order.paymentStatus}</span></p>
          </div>
        </div>
        <div className="bg-white border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><MapPin size={14} /> Shipping Address</h3>
          {addr ? (
            <div className="text-sm text-text-muted">
              <p>{addr.fullName}</p>
              <p>{addr.street}{addr.landmark ? `, ${addr.landmark}` : ''}</p>
              <p>{addr.city}, {addr.state} - {addr.pincode}</p>
              <p>{addr.phone}</p>
            </div>
          ) : <p className="text-sm text-text-muted">No address</p>}
        </div>
      </div>

      {/* Shipment tracking */}
      {(order as any).shipping?.awb && (
        <div className="bg-white border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Package size={14} /> Shipment</h3>
          <div className="space-y-1 text-sm">
            <p><span className="text-text-muted">Courier:</span> {(order as any).shipping.courierName || '—'}</p>
            <p><span className="text-text-muted">AWB:</span> <span className="font-mono">{(order as any).shipping.awb}</span></p>
            {(order as any).shipping.trackingUrl && (
              <a href={(order as any).shipping.trackingUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline mt-2">
                <ExternalLink size={13} /> Track Shipment
              </a>
            )}
          </div>
        </div>
      )}

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowCancelModal(false)}>
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle size={20} className="text-red-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Cancel Order</h3>
                <p className="text-sm text-gray-500">#{order.id.slice(-8).toUpperCase()}</p>
              </div>
            </div>

            {cancelError && (
              <div className="mb-3 bg-red-50 text-red-600 px-3 py-2 rounded-lg text-sm">{cancelError}</div>
            )}

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Why do you want to cancel? *</label>
              <textarea
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
                placeholder="e.g., Ordered by mistake, found a better price, changed my mind..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
              />
            </div>

            <div className="flex gap-2 justify-end">
              <button onClick={() => { setShowCancelModal(false); setCancelReason(''); setCancelError(''); }} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
                Keep Order
              </button>
              <button
                onClick={handleCancel}
                disabled={!cancelReason.trim() || cancelling}
                className="px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {cancelling ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                Cancel Order
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderDetailPage;
