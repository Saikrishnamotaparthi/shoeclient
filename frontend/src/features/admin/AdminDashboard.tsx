import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/services/api';
import AdminLayout from '@/layouts/AdminLayout';
import {
  IndianRupee, ShoppingCart, Package, Users, AlertTriangle,
  TrendingUp, ArrowUpRight, ArrowDownRight, Clock, Truck,
  RotateCcw, Wallet, Eye, ChevronRight, RefreshCw, BarChart3
} from 'lucide-react';

interface Metrics {
  revenue: { total: number; today: number; month: number };
  orders: { total: number; today: number; pending: number; pendingShipments: number };
  products: { total: number; lowStock: number };
  customers: { total: number };
  returnRequests: number;
  refundsPending: number;
  recentOrders: any[];
  alerts: { type: string; message: string; link: string }[];
}

const STATUS_COLORS: Record<string, string> = {
  PLACED: 'bg-blue-50 text-blue-600 border-blue-200',
  CONFIRMED: 'bg-indigo-50 text-indigo-600 border-indigo-200',
  PROCESSING: 'bg-amber-50 text-amber-600 border-amber-200',
  PACKED: 'bg-orange-50 text-orange-600 border-orange-200',
  SHIPMENT_CREATED: 'bg-purple-50 text-purple-600 border-purple-200',
  SHIPPED: 'bg-cyan-50 text-cyan-600 border-cyan-200',
  DELIVERED: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  CANCELLED: 'bg-red-50 text-red-600 border-red-200',
};

const fmt = (n: number) => `₹${n.toLocaleString('en-IN')}`;

// ─── Stat Card ────────────────────────────────────────────────────────────
const StatCard = ({
  label, value, sub, icon: Icon, color, onClick, trend
}: {
  label: string; value: string | number; sub?: string;
  icon: any; color: string; onClick?: () => void; trend?: 'up' | 'down' | null;
}) => (
  <button
    onClick={onClick}
    className={`group bg-white rounded-xl border border-gray-100 p-5 text-left hover:shadow-md hover:border-gray-200 transition-all duration-200 ${onClick ? 'cursor-pointer' : 'cursor-default'}`}
  >
    <div className="flex items-start justify-between mb-3">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
        <Icon size={20} className="text-white" />
      </div>
      {trend && (
        <span className={`flex items-center gap-0.5 text-xs font-medium ${trend === 'up' ? 'text-emerald-500' : 'text-red-500'}`}>
          {trend === 'up' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
        </span>
      )}
    </div>
    <p className="text-2xl font-bold text-gray-900 tracking-tight">{value}</p>
    <p className="text-xs text-gray-500 mt-1 font-medium">{label}</p>
    {sub && <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>}
  </button>
);

// ─── Alert Banner ─────────────────────────────────────────────────────────
const AlertBanner = ({ alerts, onNavigate }: { alerts: Metrics['alerts']; onNavigate: (link: string) => void }) => {
  if (!alerts || alerts.length === 0) return null;
  return (
    <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/60 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle size={16} className="text-amber-600" />
        <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Needs Attention</p>
        <span className="bg-amber-200 text-amber-800 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{alerts.length}</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {alerts.map((alert, i) => (
          <button
            key={i}
            onClick={() => onNavigate(alert.link)}
            className="flex items-center gap-2 text-sm text-amber-800 hover:text-amber-900 hover:bg-white/60 rounded-lg px-3 py-2 transition-colors text-left group"
          >
            <span className="group-hover:underline flex-1">{alert.message}</span>
            <ChevronRight size={14} className="text-amber-500 shrink-0 group-hover:translate-x-0.5 transition-transform" />
          </button>
        ))}
      </div>
    </div>
  );
};

// ─── Main Dashboard ───────────────────────────────────────────────────────
export const AdminDashboard = () => {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const fetchMetrics = () => {
    setLoading(true);
    setError(null);
    api.get('/admin/metrics')
      .then(res => setMetrics(res.data))
      .catch(err => {
        console.error('Failed to fetch admin metrics', err);
        setError('Failed to load dashboard. Please try again.');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchMetrics(); }, []);

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-full min-h-[60vh]">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-3 border-gray-200 border-t-primary rounded-full animate-spin" />
            <p className="text-sm text-gray-400">Loading dashboard...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center h-full min-h-[60vh] gap-4">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center">
            <AlertTriangle size={28} className="text-red-400" />
          </div>
          <p className="text-gray-600">{error}</p>
          <button onClick={fetchMetrics} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-primary/90 transition-colors">
            <RefreshCw size={14} /> Try Again
          </button>
        </div>
      </AdminLayout>
    );
  }

  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-sm text-gray-500 mt-0.5">{today}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchMetrics} className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg hover:bg-white transition-colors">
              <RefreshCw size={14} /> Refresh
            </button>
            <button onClick={() => navigate('/admin/analytics')} className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors">
              <BarChart3 size={14} /> View Reports
            </button>
          </div>
        </div>

        {/* Alerts */}
        <AlertBanner alerts={metrics?.alerts || []} onNavigate={navigate} />

        {/* Revenue KPIs */}
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Revenue</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              label="Today's Sales"
              value={fmt(metrics?.revenue?.today || 0)}
              sub={`${metrics?.orders?.today || 0} orders`}
              icon={IndianRupee}
              color="bg-emerald-500"
              trend="up"
              onClick={() => navigate('/admin/orders')}
            />
            <StatCard
              label="This Month"
              value={fmt(metrics?.revenue?.month || 0)}
              icon={TrendingUp}
              color="bg-blue-500"
              onClick={() => navigate('/admin/analytics')}
            />
            <StatCard
              label="Total Revenue"
              value={fmt(metrics?.revenue?.total || 0)}
              sub={`${metrics?.orders?.total || 0} total orders`}
              icon={Wallet}
              color="bg-violet-500"
            />
          </div>
        </div>

        {/* Operations KPIs */}
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Operations</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <StatCard
              label="Pending Orders"
              value={metrics?.orders?.pending || 0}
              icon={Clock}
              color="bg-orange-500"
              onClick={() => navigate('/admin/orders?status=PLACED')}
            />
            <StatCard
              label="To Ship"
              value={metrics?.orders?.pendingShipments || 0}
              icon={Truck}
              color="bg-purple-500"
              onClick={() => navigate('/admin/orders?status=CONFIRMED')}
            />
            <StatCard
              label="Low Stock"
              value={metrics?.products?.lowStock || 0}
              icon={Package}
              color="bg-amber-500"
              onClick={() => navigate('/admin/inventory/low-stock')}
            />
            <StatCard
              label="Returns"
              value={metrics?.returnRequests || 0}
              icon={RotateCcw}
              color="bg-red-500"
              onClick={() => navigate('/admin/returns')}
            />
            <StatCard
              label="Refunds"
              value={metrics?.refundsPending || 0}
              icon={Wallet}
              color="bg-pink-500"
              onClick={() => navigate('/admin/refunds')}
            />
            <StatCard
              label="Customers"
              value={metrics?.customers?.total || 0}
              icon={Users}
              color="bg-cyan-500"
              onClick={() => navigate('/admin/customers')}
            />
          </div>
        </div>

        {/* Quick Actions + Recent Orders */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Quick Actions */}
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-2">
              {[
                { label: 'Add Product', to: '/admin/products/add', icon: '📦' },
                { label: 'Create Coupon', to: '/admin/coupons', icon: '🏷️' },
                { label: 'View Analytics', to: '/admin/analytics', icon: '📊' },
                { label: 'Manage Banners', to: '/admin/marketing', icon: '🖼️' },
                { label: 'Admin Users', to: '/admin/admin-users', icon: '👥' },
                { label: 'Store Settings', to: '/admin/settings', icon: '⚙️' },
              ].map(({ label, to, icon }) => (
                <button
                  key={label}
                  onClick={() => navigate(to)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-700 hover:bg-gray-50 hover:text-primary transition-colors group"
                >
                  <span className="text-lg">{icon}</span>
                  <span className="flex-1 text-left group-hover:font-medium">{label}</span>
                  <ChevronRight size={14} className="text-gray-300 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                </button>
              ))}
            </div>
          </div>

          {/* Recent Orders */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900">Recent Orders</h3>
              <button onClick={() => navigate('/admin/orders')} className="text-xs text-primary hover:underline flex items-center gap-1">
                View all <ChevronRight size={12} />
              </button>
            </div>
            <div className="divide-y divide-gray-50">
              {(metrics?.recentOrders || []).length === 0 ? (
                <div className="px-5 py-12 text-center">
                  <ShoppingCart size={32} className="mx-auto mb-3 text-gray-200" />
                  <p className="text-sm text-gray-400">No orders yet</p>
                </div>
              ) : (
                (metrics?.recentOrders || []).map((o: any) => (
                  <button
                    key={o.id}
                    onClick={() => navigate(`/admin/orders/${o.id}`)}
                    className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50/50 transition-colors text-left group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                        <ShoppingCart size={16} className="text-gray-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">#{o.id?.slice(-8).toUpperCase()}</p>
                        <p className="text-xs text-gray-400 truncate">{o.shippingAddress?.fullName || 'Customer'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-900">₹{Number(o.total || 0).toLocaleString('en-IN')}</p>
                        <p className="text-[11px] text-gray-400">{o.createdAt ? new Date(o.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : ''}</p>
                      </div>
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium border ${STATUS_COLORS[o.status] || 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                        {o.status?.replace(/_/g, ' ')}
                      </span>
                      <ChevronRight size={14} className="text-gray-300 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

      </div>
    </AdminLayout>
  );
};
