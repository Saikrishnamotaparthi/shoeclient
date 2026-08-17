import React, { useEffect, useState, useCallback } from 'react';
import api from '@/services/api';
import AdminLayout from '@/layouts/AdminLayout';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Shipment {
  id: string;
  orderId: string;
  orderNumber: string;
  customerName: string;
  provider: 'SHIPROCKET' | 'DELHIVERY' | 'SHADOWFAX' | string;
  awb: string | null;
  courierName: string | null;
  trackingUrl?: string | null;
  status: 'PENDING' | 'SHIPPED' | 'IN_TRANSIT' | 'DELIVERED' | 'FAILED' | 'CANCELLED' | string;
  createdAt: string;
  expectedDelivery: string | null;
}

interface Order {
  id: string;
  orderNumber: string;
  customerName?: string;
  shippingAddress?: {
    name?: string;
  };
}

/* ------------------------------------------------------------------ */
/*  Status badge helper                                                */
/* ------------------------------------------------------------------ */

const STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  SHIPPED: 'bg-blue-100 text-blue-800',
  IN_TRANSIT: 'bg-orange-100 text-orange-800',
  DELIVERED: 'bg-green-100 text-green-800',
  FAILED: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-gray-100 text-gray-600',
};

const StatusBadge = ({ status }: { status: string }) => (
  <span
    className={`px-2 py-0.5 rounded text-xs font-medium ${
      STATUS_STYLES[status] || 'bg-gray-100 text-gray-600'
    }`}
  >
    {status.replace(/_/g, ' ')}
  </span>
);

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export const AdminShipments = () => {
  /* ---- state ---- */
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // filters
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // modal
  const [showModal, setShowModal] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    orderId: '',
    provider: 'SHIPROCKET',
    weight: '',
    length: '',
    width: '',
    height: '',
  });
  const [formError, setFormError] = useState<string | null>(null);

  // action loading states
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  /* ---- fetch shipments ---- */
  const fetchShipments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = {};
      if (search) params.search = search;
      if (filterStatus) params.status = filterStatus;
      const res = await api.get('/admin/shipments', { params });
      setShipments(res.data);
    } catch (err) {
      console.error('Failed to fetch shipments', err);
      setError('Failed to load shipments. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [search, filterStatus]);

  useEffect(() => {
    fetchShipments();
  }, []);

  /* ---- fetch eligible orders for modal ---- */
  const fetchOrders = async () => {
    setOrdersLoading(true);
    try {
      const res = await api.get('/admin/orders', { params: { status: 'CONFIRMED', limit: 100 } });
      setOrders(res.data.orders || res.data);
    } catch (err) {
      console.error('Failed to fetch orders', err);
    } finally {
      setOrdersLoading(false);
    }
  };

  const openModal = () => {
    setForm({ orderId: '', provider: 'SHIPROCKET', weight: '', length: '', width: '', height: '' });
    setFormError(null);
    setShowModal(true);
    fetchOrders();
  };

  /* ---- create shipment ---- */
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.orderId) {
      setFormError('Please select an order.');
      return;
    }
    setCreating(true);
    setFormError(null);
    try {
      const payload: any = {
        provider: form.provider,
        weight: form.weight ? Number(form.weight) : undefined,
        dimensions: {
          length: form.length ? Number(form.length) : undefined,
          width: form.width ? Number(form.width) : undefined,
          height: form.height ? Number(form.height) : undefined,
        },
      };
      await api.post(`/admin/orders/${form.orderId}/shipment`, payload);
      setShowModal(false);
      fetchShipments();
    } catch (err: any) {
      console.error('Failed to create shipment', err);
      setFormError(err.response?.data?.message || 'Failed to create shipment. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  /* ---- sync tracking ---- */
  const handleSync = async (shipment: Shipment) => {
    setSyncingId(shipment.id);
    try {
      await api.get(`/admin/orders/${shipment.orderId}/shipment/sync`);
      fetchShipments();
    } catch (err) {
      console.error('Failed to sync tracking', err);
      setError('Failed to sync tracking. Please try again.');
    } finally {
      setSyncingId(null);
    }
  };

  /* ---- cancel shipment ---- */
  const handleCancel = async (shipment: Shipment) => {
    if (!window.confirm(`Cancel shipment for order ${shipment.orderNumber}?`)) return;
    setCancellingId(shipment.id);
    try {
      await api.post(`/admin/orders/${shipment.orderId}/shipment/cancel`);
      fetchShipments();
    } catch (err) {
      console.error('Failed to cancel shipment', err);
      setError('Failed to cancel shipment. Please try again.');
    } finally {
      setCancellingId(null);
    }
  };

  /* ---- view tracking (open external) ---- */
  const handleViewTracking = (shipment: Shipment) => {
    if (!shipment.awb) return;
    const url =
      shipment.provider === 'DELHIVERY'
        ? `https://www.delhivery.com/track/package/${shipment.awb}`
        : `https://shiprocket.co/tracking/${shipment.awb}`;
    window.open(url, '_blank', 'noopener');
  };

  /* ---- print label ---- */
  const handlePrintLabel = async (shipment: Shipment) => {
    try {
      const res = await api.get(`/admin/orders/${shipment.orderId}/shipment/label`, {
        responseType: 'blob',
      });
      // Check if response is JSON (label data) or PDF
      const contentType = String(res.headers?.['content-type'] || '');
      if (contentType.includes('application/json') || (res.data instanceof Blob && res.data.type === 'application/json')) {
        // Label data returned as JSON — open tracking URL instead
        if (shipment.trackingUrl) {
          window.open(shipment.trackingUrl, '_blank');
        } else {
          setError('Label not available yet. Please try again after shipment is processed.');
        }
        return;
      }
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const win = window.open(url, '_blank');
      if (win) {
        win.onload = () => win.print();
      }
    } catch (err: any) {
      if (err.response?.status === 404) {
        // No label available — try tracking URL
        if (shipment.trackingUrl) {
          window.open(shipment.trackingUrl, '_blank');
        } else {
          setError('Label not available. Shipment may not be processed yet.');
        }
      } else {
        console.error('Failed to fetch label', err);
        setError('Failed to load shipping label. Please try again.');
      }
    }
  };

  /* ---- date formatter ---- */
  const fmtDate = (iso: string | null) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  /* ---- render ---- */
  return (
    <AdminLayout>
      <div className="p-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-display">Shipments</h1>
          <button
            onClick={openModal}
            className="px-4 py-2 bg-primary text-white text-sm font-medium rounded hover:bg-primary/90 transition-colors"
          >
            + Create Shipment
          </button>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded flex items-center justify-between">
            <span className="text-sm">{error}</span>
            <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700 text-lg">
              &times;
            </button>
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-3 mb-5 flex-wrap">
          <input
            className="border border-border rounded px-3 py-2 text-sm flex-1 min-w-[200px]"
            placeholder="Search by order #, AWB, customer…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchShipments()}
          />
          <select
            className="border border-border rounded px-3 py-2 text-sm bg-white"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="SHIPPED">Shipped</option>
            <option value="IN_TRANSIT">In Transit</option>
            <option value="DELIVERED">Delivered</option>
            <option value="FAILED">Failed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
          <button
            onClick={fetchShipments}
            className="px-4 py-2 text-sm border border-border rounded hover:bg-surface"
          >
            Search
          </button>
        </div>

        {/* Table / States */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : shipments.length === 0 ? (
          <div className="bg-white border border-border rounded p-10 text-center text-text-muted">
            No shipments found.{' '}
            <button onClick={openModal} className="text-primary hover:underline">
              Create your first shipment
            </button>
          </div>
        ) : (
          <div className="bg-white border border-border rounded overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#F0F0F0]">
                  <tr>
                    <th className="p-3 font-semibold">Order #</th>
                    <th className="p-3 font-semibold">Customer</th>
                    <th className="p-3 font-semibold">Provider</th>
                    <th className="p-3 font-semibold">AWB</th>
                    <th className="p-3 font-semibold">Courier</th>
                    <th className="p-3 font-semibold">Status</th>
                    <th className="p-3 font-semibold">Created</th>
                    <th className="p-3 font-semibold">Expected Delivery</th>
                    <th className="p-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {shipments.map((s) => (
                    <tr key={s.id} className="hover:bg-surface transition-colors">
                      <td className="p-3 font-medium">{s.orderNumber}</td>
                      <td className="p-3 text-text-muted">{s.customerName}</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-medium ${
                            s.provider === 'DELHIVERY'
                              ? 'bg-indigo-100 text-indigo-700'
                              : 'bg-purple-100 text-purple-700'
                          }`}
                        >
                          {s.provider === 'DELHIVERY' ? 'Delhivery' : 'Shiprocket'}
                        </span>
                      </td>
                      <td className="p-3 text-text-muted font-mono text-xs">{s.awb || '—'}</td>
                      <td className="p-3 text-text-muted">{s.courierName || '—'}</td>
                      <td className="p-3">
                        <StatusBadge status={s.status} />
                      </td>
                      <td className="p-3 text-text-muted text-xs">{fmtDate(s.createdAt)}</td>
                      <td className="p-3 text-text-muted text-xs">{fmtDate(s.expectedDelivery)}</td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-2 flex-wrap">
                          <button
                            onClick={() => handleSync(s)}
                            disabled={syncingId === s.id}
                            className="text-primary hover:underline text-xs disabled:opacity-50"
                          >
                            {syncingId === s.id ? 'Syncing…' : 'Sync'}
                          </button>
                          {s.awb && (
                            <button
                              onClick={() => handleViewTracking(s)}
                              className="text-primary hover:underline text-xs"
                            >
                              Track
                            </button>
                          )}
                          <button
                            onClick={() => handlePrintLabel(s)}
                            className="text-primary hover:underline text-xs"
                          >
                            Label
                          </button>
                          {!['DELIVERED', 'CANCELLED', 'FAILED'].includes(s.status) && (
                            <button
                              onClick={() => handleCancel(s)}
                              disabled={cancellingId === s.id}
                              className="text-danger hover:underline text-xs disabled:opacity-50"
                            >
                              {cancellingId === s.id ? 'Cancelling…' : 'Cancel'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-2 bg-surface border-t border-border text-xs text-text-muted">
              {shipments.length} shipment{shipments.length !== 1 ? 's' : ''}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/*  Create Shipment Modal                                       */}
        {/* ============================================================ */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
              {/* Modal header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                <h2 className="text-lg font-display">Create Shipment</h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-text-muted hover:text-text text-xl leading-none"
                >
                  &times;
                </button>
              </div>

              {/* Modal body */}
              <form onSubmit={handleCreate} className="px-6 py-5 space-y-4">
                {formError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded text-sm">
                    {formError}
                  </div>
                )}

                {/* Order select */}
                <div>
                  <label className="block text-sm font-medium mb-1">Order</label>
                  {ordersLoading ? (
                    <div className="flex items-center gap-2 text-sm text-text-muted py-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
                      Loading orders…
                    </div>
                  ) : (
                    <select
                      className="w-full border border-border rounded px-3 py-2 text-sm bg-white"
                      value={form.orderId}
                      onChange={(e) => setForm({ ...form, orderId: e.target.value })}
                    >
                      <option value="">Select an order…</option>
                      {orders.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.orderNumber} — {o.customerName || o.shippingAddress?.name || 'Unknown'}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Provider */}
                <div>
                  <label className="block text-sm font-medium mb-1">Provider</label>
                  <select
                    className="w-full border border-border rounded px-3 py-2 text-sm bg-white"
                    value={form.provider}
                    onChange={(e) => setForm({ ...form, provider: e.target.value })}
                  >
                    <option value="SHIPROCKET">Shiprocket</option>
                    <option value="DELHIVERY">Delhivery</option>
                    <option value="AUTO">Automatic (Best Rate)</option>
                  </select>
                </div>

                {/* Weight */}
                <div>
                  <label className="block text-sm font-medium mb-1">Package Weight (kg)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="w-full border border-border rounded px-3 py-2 text-sm"
                    placeholder="e.g. 1.2"
                    value={form.weight}
                    onChange={(e) => setForm({ ...form, weight: e.target.value })}
                  />
                </div>

                {/* Dimensions */}
                <div>
                  <label className="block text-sm font-medium mb-1">Dimensions (cm) — L × W × H</label>
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      className="border border-border rounded px-3 py-2 text-sm"
                      placeholder="Length"
                      value={form.length}
                      onChange={(e) => setForm({ ...form, length: e.target.value })}
                    />
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      className="border border-border rounded px-3 py-2 text-sm"
                      placeholder="Width"
                      value={form.width}
                      onChange={(e) => setForm({ ...form, width: e.target.value })}
                    />
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      className="border border-border rounded px-3 py-2 text-sm"
                      placeholder="Height"
                      value={form.height}
                      onChange={(e) => setForm({ ...form, height: e.target.value })}
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 text-sm border border-border rounded hover:bg-surface transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="px-5 py-2 bg-primary text-white text-sm font-medium rounded hover:bg-primary/90 transition-colors disabled:opacity-60"
                  >
                    {creating ? 'Creating…' : 'Create Shipment'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};
