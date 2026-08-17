import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '@/services/api';
import AdminLayout from '@/layouts/AdminLayout';

interface CustomerProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  dob: string;
  addresses: { label: string; line1: string; line2?: string; city: string; state: string; pincode: string }[];
  totalSpent: number;
  orderCount: number;
  createdAt: string;
}

interface OrderSummary {
  id: string;
  orderNumber: string;
  status: string;
  total: number;
  itemCount: number;
  createdAt: string;
}

interface ReturnRequest {
  id: string;
  orderNumber: string;
  productName: string;
  reason: string;
  status: string;
  createdAt: string;
}

interface RefundRecord {
  id: string;
  orderNumber: string;
  amount: number;
  reason: string;
  status: string;
  createdAt: string;
}

interface ReviewRecord {
  id: string;
  productName: string;
  rating: number;
  comment: string;
  status: string;
  createdAt: string;
}

const TABS = ['Profile', 'Orders', 'Returns', 'Refunds', 'Reviews'] as const;
type Tab = (typeof TABS)[number];

const ORDER_STATUS_COLORS: Record<string, string> = {
  PLACED: 'bg-blue-100 text-blue-700',
  CONFIRMED: 'bg-indigo-100 text-indigo-700',
  PACKED: 'bg-yellow-100 text-yellow-700',
  SHIPPED: 'bg-purple-100 text-purple-700',
  DELIVERED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
  RETURNED: 'bg-orange-100 text-orange-700',
};

const RETURN_STATUS_COLORS: Record<string, string> = {
  REQUESTED: 'bg-yellow-100 text-yellow-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
  COMPLETED: 'bg-blue-100 text-blue-700',
};

const REFUND_STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  PROCESSED: 'bg-green-100 text-green-700',
  FAILED: 'bg-red-100 text-red-700',
};

const REVIEW_STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
  REPORTED: 'bg-orange-100 text-orange-700',
};

export const AdminCustomerDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('Profile');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [customer, setCustomer] = useState<CustomerProfile | null>(null);
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [returns, setReturns] = useState<ReturnRequest[]>([]);
  const [refunds, setRefunds] = useState<RefundRecord[]>([]);
  const [reviews, setReviews] = useState<ReviewRecord[]>([]);

  const fetchCustomer = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/admin/customers/${id}`);
      const data = res.data;
      setCustomer(data.profile || data.customer || data);
      setOrders(data.orders || []);
      setReturns(data.returns || []);
      setRefunds(data.refunds || []);
      setReviews(data.reviews || []);
    } catch (err) {
      console.error('Failed to fetch customer', err);
      setError('Failed to load customer details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCustomer(); }, [id]);

  const formatCurrency = (amount: number) =>
    `₹${Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const renderStars = (rating: number) =>
    Array.from({ length: 5 }, (_, i) => (
      <span key={i} className={i < rating ? 'text-yellow-500' : 'text-gray-300'}>★</span>
    ));

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </AdminLayout>
    );
  }

  if (error || !customer) {
    return (
      <AdminLayout>
        <div className="p-8">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded flex items-center justify-between mb-4">
            <span className="text-sm">{error || 'Customer not found.'}</span>
            <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700 text-lg">&times;</button>
          </div>
          <button onClick={() => navigate('/admin/customers')} className="text-primary hover:underline text-sm">
            ← Back to Customers
          </button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => navigate('/admin/customers')} className="text-text-muted hover:text-primary text-sm">
            ← Customers
          </button>
          <h1 className="text-2xl font-display">{customer.name}</h1>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white border border-border rounded p-4">
            <p className="text-xs text-text-muted uppercase tracking-wide">Total Spent</p>
            <p className="text-xl font-semibold mt-1">{formatCurrency(customer.totalSpent || 0)}</p>
          </div>
          <div className="bg-white border border-border rounded p-4">
            <p className="text-xs text-text-muted uppercase tracking-wide">Orders</p>
            <p className="text-xl font-semibold mt-1">{customer.orderCount || orders.length}</p>
          </div>
          <div className="bg-white border border-border rounded p-4">
            <p className="text-xs text-text-muted uppercase tracking-wide">Returns</p>
            <p className="text-xl font-semibold mt-1">{returns.length}</p>
          </div>
          <div className="bg-white border border-border rounded p-4">
            <p className="text-xs text-text-muted uppercase tracking-wide">Reviews</p>
            <p className="text-xl font-semibold mt-1">{reviews.length}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-border mb-6">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-[1px] transition-colors ${
                activeTab === tab
                  ? 'border-primary text-primary'
                  : 'border-transparent text-text-muted hover:text-text'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'Profile' && (
          <div className="bg-white border border-border rounded p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wide mb-3">Contact Info</h3>
                <dl className="space-y-2 text-sm">
                  <div className="flex gap-2"><dt className="text-text-muted w-16">Name</dt><dd className="font-medium">{customer.name}</dd></div>
                  <div className="flex gap-2"><dt className="text-text-muted w-16">Email</dt><dd className="font-medium">{customer.email}</dd></div>
                  <div className="flex gap-2"><dt className="text-text-muted w-16">Phone</dt><dd className="font-medium">{customer.phone || '—'}</dd></div>
                  <div className="flex gap-2"><dt className="text-text-muted w-16">DOB</dt><dd className="font-medium">{customer.dob ? formatDate(customer.dob) : '—'}</dd></div>
                  <div className="flex gap-2"><dt className="text-text-muted w-16">Joined</dt><dd className="font-medium">{formatDate(customer.createdAt)}</dd></div>
                </dl>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wide mb-3">Addresses</h3>
                {customer.addresses && customer.addresses.length > 0 ? (
                  <div className="space-y-3">
                    {customer.addresses.map((addr, idx) => (
                      <div key={idx} className="text-sm p-3 bg-surface rounded">
                        {addr.label && <p className="font-medium text-xs text-primary mb-1">{addr.label}</p>}
                        <p>{addr.line1}</p>
                        {addr.line2 && <p>{addr.line2}</p>}
                        <p>{addr.city}, {addr.state} - {addr.pincode}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-text-muted">No addresses on file.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'Orders' && (
          <div className="bg-white border border-border rounded overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#F0F0F0]">
                <tr>
                  <th className="p-3 font-semibold">Order #</th>
                  <th className="p-3 font-semibold">Items</th>
                  <th className="p-3 font-semibold text-right">Total</th>
                  <th className="p-3 font-semibold">Status</th>
                  <th className="p-3 font-semibold">Date</th>
                  <th className="p-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {orders.map(o => (
                  <tr key={o.id} className="hover:bg-surface transition-colors">
                    <td className="p-3 font-medium">{o.orderNumber || o.id}</td>
                    <td className="p-3 text-text-muted">{o.itemCount} item{o.itemCount !== 1 ? 's' : ''}</td>
                    <td className="p-3 text-right font-medium">{formatCurrency(o.total)}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${ORDER_STATUS_COLORS[o.status] || 'bg-gray-100 text-gray-600'}`}>
                        {o.status}
                      </span>
                    </td>
                    <td className="p-3 text-text-muted text-xs">{formatDate(o.createdAt)}</td>
                    <td className="p-3 text-right">
                      <button onClick={() => navigate(`/admin/orders/${o.id}`)} className="text-primary hover:underline text-xs">
                        View
                      </button>
                    </td>
                  </tr>
                ))}
                {orders.length === 0 && (
                  <tr><td colSpan={6} className="p-10 text-center text-text-muted">No orders found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'Returns' && (
          <div className="bg-white border border-border rounded overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#F0F0F0]">
                <tr>
                  <th className="p-3 font-semibold">Return ID</th>
                  <th className="p-3 font-semibold">Order #</th>
                  <th className="p-3 font-semibold">Product</th>
                  <th className="p-3 font-semibold">Reason</th>
                  <th className="p-3 font-semibold">Status</th>
                  <th className="p-3 font-semibold">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {returns.map(r => (
                  <tr key={r.id} className="hover:bg-surface transition-colors">
                    <td className="p-3 font-mono text-xs">{r.id}</td>
                    <td className="p-3 font-medium">{r.orderNumber || '—'}</td>
                    <td className="p-3">{r.productName}</td>
                    <td className="p-3 text-text-muted">{r.reason}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${RETURN_STATUS_COLORS[r.status] || 'bg-gray-100 text-gray-600'}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="p-3 text-text-muted text-xs">{formatDate(r.createdAt)}</td>
                  </tr>
                ))}
                {returns.length === 0 && (
                  <tr><td colSpan={6} className="p-10 text-center text-text-muted">No return requests.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'Refunds' && (
          <div className="bg-white border border-border rounded overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#F0F0F0]">
                <tr>
                  <th className="p-3 font-semibold">Refund ID</th>
                  <th className="p-3 font-semibold">Order #</th>
                  <th className="p-3 font-semibold text-right">Amount</th>
                  <th className="p-3 font-semibold">Reason</th>
                  <th className="p-3 font-semibold">Status</th>
                  <th className="p-3 font-semibold">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {refunds.map(r => (
                  <tr key={r.id} className="hover:bg-surface transition-colors">
                    <td className="p-3 font-mono text-xs">{r.id}</td>
                    <td className="p-3 font-medium">{r.orderNumber || '—'}</td>
                    <td className="p-3 text-right font-medium text-red-600">{formatCurrency(r.amount)}</td>
                    <td className="p-3 text-text-muted">{r.reason}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${REFUND_STATUS_COLORS[r.status] || 'bg-gray-100 text-gray-600'}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="p-3 text-text-muted text-xs">{formatDate(r.createdAt)}</td>
                  </tr>
                ))}
                {refunds.length === 0 && (
                  <tr><td colSpan={6} className="p-10 text-center text-text-muted">No refund records.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'Reviews' && (
          <div className="bg-white border border-border rounded overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#F0F0F0]">
                <tr>
                  <th className="p-3 font-semibold">Product</th>
                  <th className="p-3 font-semibold">Rating</th>
                  <th className="p-3 font-semibold">Comment</th>
                  <th className="p-3 font-semibold">Status</th>
                  <th className="p-3 font-semibold">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {reviews.map(r => (
                  <tr key={r.id} className="hover:bg-surface transition-colors">
                    <td className="p-3 font-medium">{r.productName}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-1">
                        {renderStars(r.rating)}
                        <span className="text-xs text-text-muted ml-1">({r.rating})</span>
                      </div>
                    </td>
                    <td className="p-3 text-text-muted max-w-xs truncate">{r.comment}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${REVIEW_STATUS_COLORS[r.status] || 'bg-gray-100 text-gray-600'}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="p-3 text-text-muted text-xs">{formatDate(r.createdAt)}</td>
                  </tr>
                ))}
                {reviews.length === 0 && (
                  <tr><td colSpan={5} className="p-10 text-center text-text-muted">No reviews submitted.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};
