import React, { useEffect, useState, useCallback } from 'react';
import api from '@/services/api';
import AdminLayout from '@/layouts/AdminLayout';

// ── Types ────────────────────────────────────────────────────────
interface InventoryItem {
  id: string;
  productId: string;
  productName: string;
  productImage?: string;
  brand?: string;
  sku: string;
  size: string;
  stock: number;
  reorderLevel: number;
  price: number;
  lastUpdated: string;
}

interface InventoryOverview {
  totalSKUs: number;
  lowStockCount: number;
  outOfStockCount: number;
  estimatedValue: number;
}

interface HistoryEntry {
  id: string;
  productName: string;
  size: string;
  previousStock: number;
  newStock: number;
  adjustment: number;
  reason: string;
  notes?: string;
  performedBy?: string;
  createdAt: string;
}

interface ProductOption {
  id: string;
  name: string;
  sku?: string;
  sizes: { size: string; stock: number }[];
}

// ── Helpers ──────────────────────────────────────────────────────
const getStatus = (stock: number, reorderLevel: number) => {
  if (stock === 0) return 'Out of Stock';
  if (stock <= reorderLevel) return 'Low Stock';
  return 'In Stock';
};

const statusBadge = (stock: number, reorderLevel: number) => {
  const status = getStatus(stock, reorderLevel);
  const cls =
    status === 'Out of Stock'
      ? 'bg-red-100 text-red-700'
      : status === 'Low Stock'
      ? 'bg-yellow-100 text-yellow-700'
      : 'bg-green-100 text-green-700';
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${cls}`}>{status}</span>
  );
};

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatDateTime = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const ADJUST_REASONS = [
  'Restock',
  'Sold',
  'Return',
  'Damaged',
  'Correction',
  'Transfer',
  'Other',
];

// ── Component ────────────────────────────────────────────────────
export const AdminInventory = () => {
  // overview
  const [overview, setOverview] = useState<InventoryOverview | null>(null);
  // inventory table
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // filters
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  // adjustment modal
  const [showModal, setShowModal] = useState(false);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [adjProductId, setAdjProductId] = useState('');
  const [adjSize, setAdjSize] = useState('');
  const [adjAmount, setAdjAmount] = useState('');
  const [adjReason, setAdjReason] = useState('');
  const [adjNotes, setAdjNotes] = useState('');
  const [adjLoading, setAdjLoading] = useState(false);
  const [adjError, setAdjError] = useState<string | null>(null);
  const [adjSuccess, setAdjSuccess] = useState<string | null>(null);
  // history
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);

  // ── Data fetching ──────────────────────────────────────────────
  const fetchInventory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = {};
      if (search) params.search = search;
      if (filterStatus) params.status = filterStatus;
      const res = await api.get('/admin/inventory', { params });
      setItems(res.data.items ?? res.data);
      if (res.data.overview) setOverview(res.data.overview);
    } catch {
      setError('Failed to load inventory. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [search, filterStatus]);

  const fetchOverview = useCallback(async () => {
    try {
      const res = await api.get('/admin/inventory/low-stock');
      // low-stock endpoint may return overview alongside items
      if (res.data.overview) setOverview(res.data.overview);
    } catch {
      // overview is best-effort; main table still works
    }
  }, []);

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const res = await api.get('/admin/inventory/history');
      setHistory(res.data.items ?? res.data);
    } catch {
      setHistoryError('Failed to load adjustment history.');
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInventory();
    fetchOverview();
    fetchHistory();
  }, [fetchInventory, fetchOverview, fetchHistory]);

  // ── Adjustment modal helpers ───────────────────────────────────
  const selectedProduct = products.find((p) => p.id === adjProductId);

  const openModal = async () => {
    setAdjError(null);
    setAdjSuccess(null);
    setAdjProductId('');
    setAdjSize('');
    setAdjAmount('');
    setAdjReason('');
    setAdjNotes('');
    setShowModal(true);
    try {
      const res = await api.get('/admin/products', { params: { limit: 200 } });
      setProducts(
        (res.data.items ?? res.data).map((p: any) => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
          sizes: p.sizes ?? [],
        }))
      );
    } catch {
      setAdjError('Failed to load products.');
    }
  };

  const submitAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjProductId || !adjSize || !adjAmount || !adjReason) {
      setAdjError('Please fill in all required fields.');
      return;
    }
    const amount = Number(adjAmount);
    if (isNaN(amount) || amount === 0) {
      setAdjError('Adjustment amount must be a non-zero number.');
      return;
    }
    setAdjLoading(true);
    setAdjError(null);
    try {
      await api.post('/admin/inventory/adjust', {
        productId: adjProductId,
        size: adjSize,
        adjustment: amount,
        reason: adjReason,
        notes: adjNotes || undefined,
      });
      setAdjSuccess('Stock adjusted successfully.');
      setShowModal(false);
      fetchInventory();
      fetchOverview();
      fetchHistory();
    } catch (err: any) {
      setAdjError(err.response?.data?.message || 'Failed to adjust stock. Please try again.');
    } finally {
      setAdjLoading(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────
  return (
    <AdminLayout>
      <div className="p-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-display">Inventory Management</h1>
          <button
            onClick={openModal}
            className="px-4 py-2 bg-primary text-white text-sm font-medium rounded hover:bg-primary/90 transition-colors"
          >
            + Stock Adjustment
          </button>
        </div>

        {/* Success banner */}
        {adjSuccess && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded flex items-center justify-between">
            <span className="text-sm">{adjSuccess}</span>
            <button onClick={() => setAdjSuccess(null)} className="text-green-500 hover:text-green-700 text-lg">&times;</button>
          </div>
        )}

        {/* Error banner */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded flex items-center justify-between">
            <span className="text-sm">{error}</span>
            <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700 text-lg">&times;</button>
          </div>
        )}

        {/* Overview Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total SKUs', value: overview?.totalSKUs ?? '—', accent: 'text-primary' },
            { label: 'Low Stock', value: overview?.lowStockCount ?? '—', accent: 'text-yellow-600' },
            { label: 'Out of Stock', value: overview?.outOfStockCount ?? '—', accent: 'text-red-600' },
            {
              label: 'Estimated Value',
              value: overview?.estimatedValue != null ? `₹${Number(overview.estimatedValue).toLocaleString('en-IN')}` : '—',
              accent: 'text-primary',
            },
          ].map((card) => (
            <div key={card.label} className="bg-white border border-border rounded p-4">
              <p className="text-xs text-text-muted uppercase tracking-wide mb-1">{card.label}</p>
              <p className={`text-xl font-bold ${card.accent}`}>{card.value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-3 mb-5 flex-wrap">
          <input
            className="border border-border rounded px-3 py-2 text-sm flex-1 min-w-[200px]"
            placeholder="Search product, SKU, size…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchInventory()}
          />
          <select
            className="border border-border rounded px-3 py-2 text-sm bg-white"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="">All Status</option>
            <option value="in-stock">In Stock</option>
            <option value="low-stock">Low Stock</option>
            <option value="out-of-stock">Out of Stock</option>
          </select>
          <button onClick={fetchInventory} className="px-4 py-2 text-sm border border-border rounded hover:bg-surface">
            Search
          </button>
        </div>

        {/* Inventory Table */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : (
          <div className="bg-white border border-border rounded overflow-hidden mb-8">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#F0F0F0]">
                <tr>
                  <th className="p-3 font-semibold">Product</th>
                  <th className="p-3 font-semibold">SKU</th>
                  <th className="p-3 font-semibold">Size</th>
                  <th className="p-3 font-semibold">Current Stock</th>
                  <th className="p-3 font-semibold">Reorder Level</th>
                  <th className="p-3 font-semibold">Status</th>
                  <th className="p-3 font-semibold">Last Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((item) => (
                  <tr key={`${item.productId}-${item.size}`} className="hover:bg-surface transition-colors">
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={item.productImage || 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2240%22 height=%2240%22 fill=%22%23e5e7eb%22%3E%3Crect width=%2240%22 height=%2240%22 rx=%224%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 font-size=%2212%22 fill=%22%239ca3af%22%3Eimg%3C/text%3E%3C/svg%3E'}
                          alt={item.productName}
                          className="w-10 h-10 object-cover rounded"
                        />
                        <div>
                          <p className="font-medium">{item.productName}</p>
                          {item.brand && <p className="text-text-muted text-xs">{item.brand}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-text-muted">{item.sku || '—'}</td>
                    <td className="p-3">{item.size}</td>
                    <td className="p-3 font-medium">{item.stock}</td>
                    <td className="p-3 text-text-muted">{item.reorderLevel}</td>
                    <td className="p-3">{statusBadge(item.stock, item.reorderLevel)}</td>
                    <td className="p-3 text-text-muted text-xs">{formatDate(item.lastUpdated)}</td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-10 text-center text-text-muted">
                      No inventory items found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            <div className="px-4 py-2 bg-surface border-t border-border text-xs text-text-muted">
              {items.length} item{items.length !== 1 ? 's' : ''}
            </div>
          </div>
        )}

        {/* History Table */}
        <div className="mb-6">
          <h2 className="text-lg font-display mb-4">Recent Stock Adjustments</h2>
          {historyError && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded flex items-center justify-between">
              <span className="text-sm">{historyError}</span>
              <button onClick={() => setHistoryError(null)} className="text-red-500 hover:text-red-700 text-lg">&times;</button>
            </div>
          )}
          {historyLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : (
            <div className="bg-white border border-border rounded overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#F0F0F0]">
                  <tr>
                    <th className="p-3 font-semibold">Product</th>
                    <th className="p-3 font-semibold">Size</th>
                    <th className="p-3 font-semibold">Adjustment</th>
                    <th className="p-3 font-semibold">Previous → New</th>
                    <th className="p-3 font-semibold">Reason</th>
                    <th className="p-3 font-semibold">Notes</th>
                    <th className="p-3 font-semibold">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {history.map((h) => (
                    <tr key={h.id} className="hover:bg-surface transition-colors">
                      <td className="p-3 font-medium">{h.productName}</td>
                      <td className="p-3">{h.size}</td>
                      <td className="p-3">
                        <span className={`font-medium ${h.adjustment > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {h.adjustment > 0 ? '+' : ''}
                          {h.adjustment}
                        </span>
                      </td>
                      <td className="p-3 text-text-muted">
                        {h.previousStock} → {h.newStock}
                      </td>
                      <td className="p-3">{h.reason}</td>
                      <td className="p-3 text-text-muted text-xs max-w-[200px] truncate">{h.notes || '—'}</td>
                      <td className="p-3 text-text-muted text-xs">{formatDateTime(h.createdAt)}</td>
                    </tr>
                  ))}
                  {history.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-10 text-center text-text-muted">
                        No stock adjustments recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Stock Adjustment Modal ─────────────────────────────── */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Overlay */}
            <div className="absolute inset-0 bg-black/40" onClick={() => !adjLoading && setShowModal(false)} />
            {/* Dialog */}
            <div className="relative bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 p-6 z-10">
              <h2 className="text-lg font-display mb-4">Stock Adjustment</h2>

              {adjError && (
                <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded flex items-center justify-between">
                  <span className="text-sm">{adjError}</span>
                  <button onClick={() => setAdjError(null)} className="text-red-500 hover:text-red-700 text-lg">&times;</button>
                </div>
              )}

              <form onSubmit={submitAdjustment} className="space-y-4">
                {/* Product select */}
                <div>
                  <label className="block text-sm font-medium mb-1">Product *</label>
                  <select
                    className="w-full border border-border rounded px-3 py-2 text-sm bg-white"
                    value={adjProductId}
                    onChange={(e) => {
                      setAdjProductId(e.target.value);
                      setAdjSize('');
                    }}
                  >
                    <option value="">Select a product</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} {p.sku ? `(${p.sku})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Size select */}
                <div>
                  <label className="block text-sm font-medium mb-1">Size *</label>
                  <select
                    className="w-full border border-border rounded px-3 py-2 text-sm bg-white"
                    value={adjSize}
                    onChange={(e) => setAdjSize(e.target.value)}
                    disabled={!adjProductId}
                  >
                    <option value="">Select a size</option>
                    {(selectedProduct?.sizes ?? []).map((s) => (
                      <option key={s.size} value={s.size}>
                        {s.size} (current: {s.stock})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Adjustment amount */}
                <div>
                  <label className="block text-sm font-medium mb-1">Adjustment Amount *</label>
                  <input
                    type="number"
                    className="w-full border border-border rounded px-3 py-2 text-sm"
                    placeholder="+5 to add, -3 to remove"
                    value={adjAmount}
                    onChange={(e) => setAdjAmount(e.target.value)}
                  />
                </div>

                {/* Reason */}
                <div>
                  <label className="block text-sm font-medium mb-1">Reason *</label>
                  <select
                    className="w-full border border-border rounded px-3 py-2 text-sm bg-white"
                    value={adjReason}
                    onChange={(e) => setAdjReason(e.target.value)}
                  >
                    <option value="">Select reason</option>
                    {ADJUST_REASONS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium mb-1">Notes</label>
                  <textarea
                    className="w-full border border-border rounded px-3 py-2 text-sm resize-none"
                    rows={3}
                    placeholder="Optional notes…"
                    value={adjNotes}
                    onChange={(e) => setAdjNotes(e.target.value)}
                  />
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    disabled={adjLoading}
                    className="px-4 py-2 text-sm border border-border rounded hover:bg-surface transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={adjLoading}
                    className="px-4 py-2 bg-primary text-white text-sm font-medium rounded hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    {adjLoading ? 'Saving…' : 'Save Adjustment'}
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
