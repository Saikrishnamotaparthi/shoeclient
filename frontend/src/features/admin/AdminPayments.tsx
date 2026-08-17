import React, { useEffect, useState } from 'react';
import api from '@/services/api';
import AdminLayout from '@/layouts/AdminLayout';

interface Payment {
  id: string;
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  amount: number;
  method: string;
  status: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  createdAt: string;
}

interface ReconciliationRow {
  orderId: string;
  orderNumber: string;
  customerName: string;
  orderTotal: number;
  paymentCaptured: number;
  refunded: number;
  net: number;
}

const STATUS_COLORS: Record<string, string> = {
  CREATED: 'bg-blue-100 text-blue-700',
  AUTHORIZED: 'bg-yellow-100 text-yellow-700',
  CAPTURED: 'bg-green-100 text-green-700',
  FAILED: 'bg-red-100 text-red-700',
  REFUNDED: 'bg-purple-100 text-purple-700',
  PARTIALLY_REFUNDED: 'bg-orange-100 text-orange-700',
};

export const AdminPayments = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterMethod, setFilterMethod] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [view, setView] = useState<'transactions' | 'reconciliation'>('transactions');
  const [reconciliation, setReconciliation] = useState<ReconciliationRow[]>([]);

  const fetchPayments = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = {};
      if (filterStatus) params.status = filterStatus;
      if (filterMethod) params.method = filterMethod;
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;
      const res = await api.get('/admin/payments', { params });
      setPayments(res.data.payments || res.data);
      if (res.data.reconciliation) {
        setReconciliation(res.data.reconciliation);
      }
    } catch (err) {
      console.error('Failed to fetch payments', err);
      setError('Failed to load payments. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPayments(); }, []);

  const formatCurrency = (amount: number) =>
    `₹${Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  // Compute reconciliation from payments if not provided by API
  const computedReconciliation: ReconciliationRow[] = reconciliation.length > 0
    ? reconciliation
    : Object.values(
        payments.reduce((acc: Record<string, ReconciliationRow>, p) => {
          if (!acc[p.orderId]) {
            acc[p.orderId] = {
              orderId: p.orderId,
              orderNumber: p.orderNumber,
              customerName: p.customerName,
              orderTotal: 0,
              paymentCaptured: 0,
              refunded: 0,
              net: 0,
            };
          }
          const row = acc[p.orderId];
          row.orderTotal = p.amount; // latest amount for the order
          if (p.status === 'CAPTURED') row.paymentCaptured += p.amount;
          if (p.status === 'REFUNDED' || p.status === 'PARTIALLY_REFUNDED') row.refunded += p.amount;
          row.net = row.paymentCaptured - row.refunded;
          return acc;
        }, {})
      );

  return (
    <AdminLayout>
      <div className="p-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-display">Payments</h1>
          <div className="flex gap-2">
            <button
              onClick={() => setView('transactions')}
              className={`px-4 py-2 text-sm font-medium rounded transition-colors ${
                view === 'transactions'
                  ? 'bg-primary text-white'
                  : 'border border-border hover:bg-surface'
              }`}
            >
              Transactions
            </button>
            <button
              onClick={() => setView('reconciliation')}
              className={`px-4 py-2 text-sm font-medium rounded transition-colors ${
                view === 'reconciliation'
                  ? 'bg-primary text-white'
                  : 'border border-border hover:bg-surface'
              }`}
            >
              Reconciliation
            </button>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded flex items-center justify-between">
            <span className="text-sm">{error}</span>
            <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700 text-lg">&times;</button>
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-3 mb-5 flex-wrap">
          <select
            className="border border-border rounded px-3 py-2 text-sm bg-white"
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
          >
            <option value="">All Statuses</option>
            {['CREATED', 'AUTHORIZED', 'CAPTURED', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED'].map(s => (
              <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
            ))}
          </select>
          <select
            className="border border-border rounded px-3 py-2 text-sm bg-white"
            value={filterMethod}
            onChange={e => setFilterMethod(e.target.value)}
          >
            <option value="">All Methods</option>
            <option value="razorpay">Razorpay</option>
            <option value="cod">COD</option>
          </select>
          <input
            type="date"
            className="border border-border rounded px-3 py-2 text-sm bg-white"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            placeholder="From"
          />
          <input
            type="date"
            className="border border-border rounded px-3 py-2 text-sm bg-white"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            placeholder="To"
          />
          <button onClick={fetchPayments} className="px-4 py-2 text-sm border border-border rounded hover:bg-surface">
            Search
          </button>
        </div>

        {/* Loading */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : view === 'transactions' ? (
          /* ── Transactions Table ── */
          <div className="bg-white border border-border rounded overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#F0F0F0]">
                <tr>
                  <th className="p-3 font-semibold">Payment ID</th>
                  <th className="p-3 font-semibold">Order #</th>
                  <th className="p-3 font-semibold">Customer</th>
                  <th className="p-3 font-semibold text-right">Amount</th>
                  <th className="p-3 font-semibold">Method</th>
                  <th className="p-3 font-semibold">Status</th>
                  <th className="p-3 font-semibold">Razorpay Order ID</th>
                  <th className="p-3 font-semibold">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {payments.map(p => (
                  <tr key={p.id} className="hover:bg-surface transition-colors">
                    <td className="p-3 font-mono text-xs">{p.id}</td>
                    <td className="p-3 font-medium">{p.orderNumber || '—'}</td>
                    <td className="p-3">
                      <p className="font-medium">{p.customerName}</p>
                      <p className="text-text-muted text-xs">{p.customerEmail}</p>
                    </td>
                    <td className="p-3 text-right font-medium">{formatCurrency(p.amount)}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        p.method === 'cod' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {p.method === 'cod' ? 'COD' : 'Razorpay'}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[p.status] || 'bg-gray-100 text-gray-600'}`}>
                        {p.status?.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-xs text-text-muted">{p.razorpayOrderId || '—'}</td>
                    <td className="p-3 text-text-muted text-xs">{formatDate(p.createdAt)}</td>
                  </tr>
                ))}
                {payments.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-10 text-center text-text-muted">
                      No payments found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            <div className="px-4 py-2 bg-surface border-t border-border text-xs text-text-muted">
              {payments.length} transaction{payments.length !== 1 ? 's' : ''}
            </div>
          </div>
        ) : (
          /* ── Reconciliation View ── */
          <div className="bg-white border border-border rounded overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#F0F0F0]">
                <tr>
                  <th className="p-3 font-semibold">Order #</th>
                  <th className="p-3 font-semibold">Customer</th>
                  <th className="p-3 font-semibold text-right">Order Total</th>
                  <th className="p-3 font-semibold text-right">Payment Captured</th>
                  <th className="p-3 font-semibold text-right">Refunded</th>
                  <th className="p-3 font-semibold text-right">Net</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {computedReconciliation.map(row => (
                  <tr key={row.orderId} className="hover:bg-surface transition-colors">
                    <td className="p-3 font-medium">{row.orderNumber || '—'}</td>
                    <td className="p-3">{row.customerName}</td>
                    <td className="p-3 text-right">{formatCurrency(row.orderTotal)}</td>
                    <td className="p-3 text-right text-green-700">{formatCurrency(row.paymentCaptured)}</td>
                    <td className="p-3 text-right text-red-600">{formatCurrency(row.refunded)}</td>
                    <td className="p-3 text-right font-medium">{formatCurrency(row.net)}</td>
                  </tr>
                ))}
                {computedReconciliation.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-10 text-center text-text-muted">
                      No reconciliation data available.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            {computedReconciliation.length > 0 && (
              <div className="px-4 py-3 bg-surface border-t border-border flex justify-end gap-8 text-sm font-medium">
                <span>
                  Total Captured:{' '}
                  <span className="text-green-700">
                    {formatCurrency(computedReconciliation.reduce((s, r) => s + r.paymentCaptured, 0))}
                  </span>
                </span>
                <span>
                  Total Refunded:{' '}
                  <span className="text-red-600">
                    {formatCurrency(computedReconciliation.reduce((s, r) => s + r.refunded, 0))}
                  </span>
                </span>
                <span>
                  Net Revenue:{' '}
                  {formatCurrency(computedReconciliation.reduce((s, r) => s + r.net, 0))}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};
