import React, { useState, useEffect, useCallback } from 'react';
import api from '@/services/api';
import AdminLayout from '@/layouts/AdminLayout';

// ─── Types ────────────────────────────────────────────────────────────────────

type DateRange = '1d' | '7d' | '30d' | '90d';
type Tab = 'sales' | 'products' | 'customers';

interface DailyRevenue {
  date: string;
  revenue: number;
  orders: number;
}

interface OrderStatusBreakdown {
  status: string;
  count: number;
  revenue: number;
}

interface SalesData {
  totalRevenue: number;
  totalOrders: number;
  avgOrderValue: number;
  cancellationRate: number;
  dailyRevenue: DailyRevenue[];
  orderStatusBreakdown: OrderStatusBreakdown[];
}

interface TopProduct {
  name: string;
  brand: string;
  unitsSold: number;
  revenue: number;
}

interface TopCategory {
  category: string;
  orders: number;
  revenue: number;
}

interface ProductsData {
  topProducts: TopProduct[];
  topCategories: TopCategory[];
}

interface TopCustomer {
  name: string;
  email: string;
  orderCount: number;
  totalSpent: number;
}

interface CustomersData {
  newCustomers: number;
  returningCustomers: number;
  avgLTV: number;
  topCustomers: TopCustomer[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DATE_RANGES: { label: string; value: DateRange }[] = [
  { label: 'Today', value: '1d' },
  { label: '7 Days', value: '7d' },
  { label: '30 Days', value: '30d' },
  { label: '90 Days', value: '90d' },
];

const TABS: { label: string; value: Tab }[] = [
  { label: 'Sales', value: 'sales' },
  { label: 'Products', value: 'products' },
  { label: 'Customers', value: 'customers' },
];

const STATUS_COLORS: Record<string, string> = {
  PLACED: 'bg-blue-100 text-blue-700',
  CONFIRMED: 'bg-indigo-100 text-indigo-700',
  PROCESSING: 'bg-yellow-100 text-yellow-700',
  PACKED: 'bg-orange-100 text-orange-700',
  SHIPMENT_CREATED: 'bg-purple-100 text-purple-700',
  SHIPPED: 'bg-cyan-100 text-cyan-700',
  DELIVERED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

// ─── Shared Components ────────────────────────────────────────────────────────

const KPICard = ({ label, value, sub, color = 'text-text' }: { label: string; value: string | number; sub?: string; color?: string }) => (
  <div className="bg-white border border-border rounded p-5">
    <p className="text-[11px] font-semibold uppercase tracking-wider text-text-muted mb-1">{label}</p>
    <p className={`text-3xl font-display ${color}`}>{value}</p>
    {sub && <p className="text-xs text-text-muted mt-0.5">{sub}</p>}
  </div>
);

const LoadingSpinner = () => (
  <AdminLayout>
    <div className="flex justify-center items-center h-screen">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
    </div>
  </AdminLayout>
);

const ErrorState = ({ message, onRetry }: { message: string; onRetry: () => void }) => (
  <AdminLayout>
    <div className="flex flex-col justify-center items-center h-screen gap-4">
      <p className="text-red-600">{message}</p>
      <button onClick={onRetry} className="px-4 py-2 bg-primary text-white rounded text-sm">Retry</button>
    </div>
  </AdminLayout>
);

const fmt = (n: number) => `₹${n.toLocaleString('en-IN')}`;

// ─── Sales Tab ────────────────────────────────────────────────────────────────

const SalesTab = ({ data }: { data: SalesData }) => {
  const maxRevenue = Math.max(...data.dailyRevenue.map(d => d.revenue), 1);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        <KPICard label="Total Revenue" value={fmt(data.totalRevenue)} />
        <KPICard label="Total Orders" value={data.totalOrders.toLocaleString('en-IN')} />
        <KPICard label="Avg Order Value" value={fmt(data.avgOrderValue)} />
        <KPICard
          label="Cancellation Rate"
          value={`${data.cancellationRate.toFixed(1)}%`}
          color={data.cancellationRate > 5 ? 'text-red-600' : 'text-text'}
        />
      </div>

      {/* Daily Revenue Chart */}
      <div className="bg-white border border-border rounded p-5">
        <h3 className="text-sm font-semibold mb-4">Daily Revenue</h3>
        {data.dailyRevenue.length === 0 ? (
          <p className="text-text-muted text-sm text-center py-8">No revenue data for this period.</p>
        ) : (
          <div className="flex items-end gap-1 h-48">
            {data.dailyRevenue.map((day, i) => {
              const height = maxRevenue > 0 ? (day.revenue / maxRevenue) * 100 : 0;
              return (
                <div key={i} className="flex-1 flex flex-col items-center group relative">
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 hidden group-hover:block bg-gray-800 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap z-10">
                    {fmt(day.revenue)} &middot; {day.orders} orders
                  </div>
                  <div className="w-full flex items-end justify-center" style={{ height: '160px' }}>
                    <div
                      className="w-full max-w-[24px] bg-primary/80 rounded-t transition-all group-hover:bg-primary"
                      style={{ height: `${Math.max(height, 2)}%` }}
                    />
                  </div>
                  <span className="text-[9px] text-text-muted mt-1 truncate w-full text-center">
                    {new Date(day.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Order Status Breakdown */}
      <div className="bg-white border border-border rounded">
        <div className="px-5 py-3 border-b border-border">
          <h3 className="text-sm font-semibold">Order Status Breakdown</h3>
        </div>
        {data.orderStatusBreakdown.length === 0 ? (
          <p className="text-text-muted text-sm text-center py-8">No orders in this period.</p>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="bg-[#F8F8F8]">
              <tr>
                <th className="px-5 py-2.5 font-medium text-xs text-text-muted">Status</th>
                <th className="px-5 py-2.5 font-medium text-xs text-text-muted text-right">Orders</th>
                <th className="px-5 py-2.5 font-medium text-xs text-text-muted text-right">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.orderStatusBreakdown.map((s) => (
                <tr key={s.status} className="hover:bg-surface">
                  <td className="px-5 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${STATUS_COLORS[s.status] || 'bg-gray-100 text-gray-500'}`}>
                      {s.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right font-mono text-xs">{s.count.toLocaleString('en-IN')}</td>
                  <td className="px-5 py-3 text-right font-medium">{fmt(s.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

// ─── Products Tab ─────────────────────────────────────────────────────────────

const ProductsTab = ({ data }: { data: ProductsData }) => (
  <div className="grid grid-cols-2 gap-6">
    {/* Top Selling Products */}
    <div className="bg-white border border-border rounded">
      <div className="px-5 py-3 border-b border-border">
        <h3 className="text-sm font-semibold">Top Selling Products</h3>
      </div>
      {data.topProducts.length === 0 ? (
        <p className="text-text-muted text-sm text-center py-8">No product data for this period.</p>
      ) : (
        <table className="w-full text-sm text-left">
          <thead className="bg-[#F8F8F8]">
            <tr>
              <th className="px-5 py-2.5 font-medium text-xs text-text-muted">Name</th>
              <th className="px-5 py-2.5 font-medium text-xs text-text-muted">Brand</th>
              <th className="px-5 py-2.5 font-medium text-xs text-text-muted text-right">Units Sold</th>
              <th className="px-5 py-2.5 font-medium text-xs text-text-muted text-right">Revenue</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.topProducts.map((p, i) => (
              <tr key={i} className="hover:bg-surface">
                <td className="px-5 py-3 font-medium truncate max-w-[200px]">{p.name}</td>
                <td className="px-5 py-3 text-text-muted">{p.brand}</td>
                <td className="px-5 py-3 text-right font-mono text-xs">{p.unitsSold.toLocaleString('en-IN')}</td>
                <td className="px-5 py-3 text-right font-medium">{fmt(p.revenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>

    {/* Top Categories */}
    <div className="bg-white border border-border rounded">
      <div className="px-5 py-3 border-b border-border">
        <h3 className="text-sm font-semibold">Top Categories</h3>
      </div>
      {data.topCategories.length === 0 ? (
        <p className="text-text-muted text-sm text-center py-8">No category data for this period.</p>
      ) : (
        <table className="w-full text-sm text-left">
          <thead className="bg-[#F8F8F8]">
            <tr>
              <th className="px-5 py-2.5 font-medium text-xs text-text-muted">Category</th>
              <th className="px-5 py-2.5 font-medium text-xs text-text-muted text-right">Orders</th>
              <th className="px-5 py-2.5 font-medium text-xs text-text-muted text-right">Revenue</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.topCategories.map((c, i) => (
              <tr key={i} className="hover:bg-surface">
                <td className="px-5 py-3 font-medium">{c.category}</td>
                <td className="px-5 py-3 text-right font-mono text-xs">{c.orders.toLocaleString('en-IN')}</td>
                <td className="px-5 py-3 text-right font-medium">{fmt(c.revenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  </div>
);

// ─── Customers Tab ────────────────────────────────────────────────────────────

const CustomersTab = ({ data }: { data: CustomersData }) => (
  <div className="space-y-6">
    {/* KPI Cards */}
    <div className="grid grid-cols-3 gap-4">
      <KPICard label="New Customers" value={data.newCustomers.toLocaleString('en-IN')} />
      <KPICard label="Returning Customers" value={data.returningCustomers.toLocaleString('en-IN')} />
      <KPICard label="Avg Lifetime Value" value={fmt(data.avgLTV)} />
    </div>

    {/* Top Customers */}
    <div className="bg-white border border-border rounded">
      <div className="px-5 py-3 border-b border-border">
        <h3 className="text-sm font-semibold">Top Customers</h3>
      </div>
      {data.topCustomers.length === 0 ? (
        <p className="text-text-muted text-sm text-center py-8">No customer data for this period.</p>
      ) : (
        <table className="w-full text-sm text-left">
          <thead className="bg-[#F8F8F8]">
            <tr>
              <th className="px-5 py-2.5 font-medium text-xs text-text-muted">Name</th>
              <th className="px-5 py-2.5 font-medium text-xs text-text-muted">Email</th>
              <th className="px-5 py-2.5 font-medium text-xs text-text-muted text-right">Orders</th>
              <th className="px-5 py-2.5 font-medium text-xs text-text-muted text-right">Total Spent</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.topCustomers.map((c, i) => (
              <tr key={i} className="hover:bg-surface">
                <td className="px-5 py-3 font-medium">{c.name}</td>
                <td className="px-5 py-3 text-text-muted text-xs">{c.email}</td>
                <td className="px-5 py-3 text-right font-mono text-xs">{c.orderCount.toLocaleString('en-IN')}</td>
                <td className="px-5 py-3 text-right font-medium">{fmt(c.totalSpent)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

export const AdminAnalytics = () => {
  const [range, setRange] = useState<DateRange>('30d');
  const [tab, setTab] = useState<Tab>('sales');
  const [salesData, setSalesData] = useState<SalesData | null>(null);
  const [productsData, setProductsData] = useState<ProductsData | null>(null);
  const [customersData, setCustomersData] = useState<CustomersData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTabData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      if (tab === 'sales') {
        const res = await api.get(`/admin/analytics/sales?range=${range}`);
        setSalesData(res.data);
      } else if (tab === 'products') {
        const res = await api.get(`/admin/analytics/products?range=${range}`);
        setProductsData(res.data);
      } else {
        const res = await api.get(`/admin/analytics/customers?range=${range}`);
        setCustomersData(res.data);
      }
    } catch (err) {
      console.error(`Failed to fetch ${tab} analytics`, err);
      setError(`Failed to load ${tab} analytics. Please try again.`);
    } finally {
      setLoading(false);
    }
  }, [tab, range]);

  useEffect(() => {
    fetchTabData();
  }, [fetchTabData]);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorState message={error} onRetry={fetchTabData} />;

  return (
    <AdminLayout>
      <div className="p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display">Analytics</h1>
            <p className="text-sm text-text-muted mt-0.5">Track sales, products, and customer performance.</p>
          </div>

          {/* Date Range Selector */}
          <div className="flex bg-white border border-border rounded overflow-hidden">
            {DATE_RANGES.map((r) => (
              <button
                key={r.value}
                onClick={() => setRange(r.value)}
                className={`px-4 py-2 text-xs font-medium transition-colors ${
                  range === r.value
                    ? 'bg-primary text-white'
                    : 'text-text-muted hover:bg-surface'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-border">
          <div className="flex gap-0">
            {TABS.map((t) => (
              <button
                key={t.value}
                onClick={() => setTab(t.value)}
                className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                  tab === t.value
                    ? 'border-primary text-primary'
                    : 'border-transparent text-text-muted hover:text-text hover:border-border'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        {tab === 'sales' && salesData && <SalesTab data={salesData} />}
        {tab === 'products' && productsData && <ProductsTab data={productsData} />}
        {tab === 'customers' && customersData && <CustomersTab data={customersData} />}
      </div>
    </AdminLayout>
  );
};
