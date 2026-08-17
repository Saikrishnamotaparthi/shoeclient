import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { orderService } from '@/services/orderService';
import { useWishlistStore } from '@/store/wishlistStore';
import { ShoppingBag, Heart, RotateCcw, ChevronRight, Package, CheckCircle } from 'lucide-react';
import type { Order } from '@/types';

const AccountPage: React.FC = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const wishlistCount = useWishlistStore(s => s.items.length);
  const fetchWishlist = useWishlistStore(s => s.fetchWishlist);

  useEffect(() => {
    if (user) {
      orderService.getOrders().then(setOrders).catch(() => {});
      fetchWishlist().catch(() => {});
    }
  }, [user, fetchWishlist]);

  const activeOrders = orders.filter(o => !['DELIVERED', 'CANCELLED', 'RETURNED', 'REFUNDED'].includes(o.status));
  const deliveredOrders = orders.filter(o => o.status === 'DELIVERED');
  const returnOrders = orders.filter(o => ['RETURNED', 'REFUNDED'].includes(o.status));
  const recentOrders = orders.slice(0, 3);

  const stats = [
    { label: 'Total Orders', value: orders.length, icon: ShoppingBag, to: '/account/orders' },
    { label: 'Active Orders', value: activeOrders.length, icon: Package, to: '/account/orders' },
    { label: 'Delivered', value: deliveredOrders.length, icon: CheckCircle, to: '/account/orders' },
    { label: 'Wishlist', value: wishlistCount, icon: Heart, to: '/account/wishlist' },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-display font-semibold">Welcome, {user?.name?.split(' ')[0] || 'there'}!</h1>
        <p className="text-text-muted text-sm mt-1">Manage your orders, addresses and preferences from here.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, to }) => (
          <Link
            key={label}
            to={to}
            className="bg-white border border-border rounded-xl p-5 flex items-center gap-4 hover:border-primary/40 hover:shadow-sm transition-all group"
          >
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
              <Icon size={18} className="text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold font-display">{value}</p>
              <p className="text-xs text-text-muted">{label}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Recent orders */}
      <div className="bg-white border border-border rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="font-semibold text-base">Recent Orders</h2>
          <Link to="/account/orders" className="text-sm text-primary hover:underline flex items-center gap-1">
            View all <ChevronRight size={14} />
          </Link>
        </div>
        {recentOrders.length === 0 ? (
          <div className="p-10 text-center text-text-muted">
            <ShoppingBag size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">No orders yet.</p>
            <Link to="/shop" className="mt-3 inline-block text-sm text-primary font-medium hover:underline">
              Start Shopping →
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {recentOrders.map(order => (
              <Link
                key={order.id}
                to={`/account/orders/${order.id}`}
                className="flex items-center justify-between px-5 py-4 hover:bg-surface transition-colors group"
              >
                <div>
                  <p className="text-sm font-medium">#{order.id.slice(-8).toUpperCase()}</p>
                  <p className="text-xs text-text-muted mt-0.5">
                    {order.items?.length} item{order.items?.length !== 1 ? 's' : ''} ·{' '}
                    {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-sm">₹{order.total?.toLocaleString('en-IN')}</span>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    order.status === 'DELIVERED' ? 'bg-green-100 text-green-700' :
                    order.status === 'SHIPPED' ? 'bg-blue-100 text-blue-700' :
                    order.status === 'CANCELLED' ? 'bg-red-100 text-red-600' :
                    'bg-amber-100 text-amber-700'
                  }`}>
                    {order.status}
                  </span>
                  <ChevronRight size={14} className="text-border group-hover:text-primary transition-colors" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[
          { label: 'Manage Addresses', desc: 'Add or edit delivery addresses', to: '/account/addresses', icon: '📍' },
          { label: 'My Wishlist', desc: `${wishlistCount} saved item${wishlistCount !== 1 ? 's' : ''}`, to: '/account/wishlist', icon: '❤️' },
          { label: 'Track an Order', desc: 'Use order number to track', to: '/track-order', icon: '📦' },
          { label: 'Returns & Refunds', desc: 'View or request returns', to: '/account/returns', icon: '↩️' },
        ].map(({ label, desc, to, icon }) => (
          <Link
            key={label}
            to={to}
            className="flex items-center gap-4 bg-white border border-border rounded-xl px-5 py-4 hover:border-primary/40 hover:shadow-sm transition-all group"
          >
            <span className="text-2xl">{icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold group-hover:text-primary transition-colors">{label}</p>
              <p className="text-xs text-text-muted mt-0.5">{desc}</p>
            </div>
            <ChevronRight size={14} className="text-border shrink-0 group-hover:text-primary transition-colors" />
          </Link>
        ))}
      </div>
    </div>
  );
};

export default AccountPage;
