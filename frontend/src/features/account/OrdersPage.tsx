import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { orderService } from '@/services/orderService';
import type { Order, OrderStatus } from '@/types';
import { ShoppingBag, ChevronRight, Search } from 'lucide-react';

const STATUS_TABS: { label: string; value: OrderStatus | 'ALL' }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'Processing', value: 'PROCESSING' },
  { label: 'Shipped', value: 'SHIPPED' },
  { label: 'Delivered', value: 'DELIVERED' },
  { label: 'Cancelled', value: 'CANCELLED' },
];

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
  PAYMENT_FAILED: 'bg-red-100 text-red-600',
};

const OrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<OrderStatus | 'ALL'>('ALL');

  useEffect(() => {
    orderService.getOrders()
      .then(setOrders)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = activeTab === 'ALL'
    ? orders
    : orders.filter(o => o.status === activeTab);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-semibold">My Orders</h1>
        <p className="text-text-muted text-sm mt-1">{orders.length} order{orders.length !== 1 ? 's' : ''} total</p>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {STATUS_TABS.map(tab => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`shrink-0 px-4 py-2 text-sm rounded-full font-medium transition-colors ${
              activeTab === tab.value
                ? 'bg-primary text-white'
                : 'bg-white border border-border text-text hover:border-primary hover:text-primary'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-24 bg-surface rounded-xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-border rounded-xl p-12 text-center">
          <ShoppingBag size={36} className="mx-auto mb-4 text-border" />
          <p className="font-medium mb-1">No orders found</p>
          {activeTab === 'ALL' ? (
            <>
              <p className="text-sm text-text-muted mb-4">You haven't placed any orders yet.</p>
              <Link to="/shop" className="px-4 py-2 bg-primary text-white rounded text-sm font-semibold hover:bg-primary/90 transition-colors inline-block">
                Shop Now
              </Link>
            </>
          ) : (
            <p className="text-sm text-text-muted">No {activeTab.toLowerCase()} orders.</p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(order => (
            <Link
              key={order.id}
              to={`/account/orders/${order.id}`}
              className="flex items-center gap-4 bg-white border border-border rounded-xl p-4 hover:border-primary/40 hover:shadow-sm transition-all group"
            >
              {/* First product image */}
              <div className="w-16 h-16 bg-surface rounded-lg overflow-hidden shrink-0">
                {order.items?.[0]?.image ? (
                  <img
                    src={order.items[0].image}
                    alt={order.items[0].name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ShoppingBag size={20} className="text-border" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <p className="text-sm font-semibold truncate">
                    #{order.id.slice(-8).toUpperCase()}
                  </p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-700'}`}>
                    {order.status.replace(/_/g, ' ')}
                  </span>
                  {(order as any).cancelledBy && (
                    <span className="text-[11px] text-gray-400">
                      by {(order as any).cancelledBy === 'admin' ? 'Store' : 'You'}
                    </span>
                  )}
                </div>
                <p className="text-xs text-text-muted">
                  {order.items?.length} item{order.items?.length !== 1 ? 's' : ''} ·{' '}
                  {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
                {order.status === 'CANCELLED' && (order as any).cancelReason && (
                  <p className="text-xs text-red-500 mt-0.5 truncate">Reason: {(order as any).cancelReason}</p>
                )}
                {order.items?.length > 1 && (
                  <p className="text-xs text-text-muted mt-0.5 truncate">
                    {order.items.map(i => i.name).join(', ')}
                  </p>
                )}
              </div>

              <div className="shrink-0 flex items-center gap-3">
                <span className="font-semibold text-sm">₹{order.total?.toLocaleString('en-IN')}</span>
                <ChevronRight size={16} className="text-border group-hover:text-primary transition-colors" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default OrdersPage;
