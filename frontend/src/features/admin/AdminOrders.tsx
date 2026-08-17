import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '@/services/api';
import AdminLayout from '@/layouts/AdminLayout';
import {
  Package, Truck, Search, ChevronRight, Printer, RefreshCw,
  Clock, CheckCircle2, XCircle, TruckIcon, Loader2, X, AlertTriangle
} from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  PLACED: 'bg-blue-50 text-blue-600 border-blue-200',
  CONFIRMED: 'bg-indigo-50 text-indigo-600 border-indigo-200',
  PROCESSING: 'bg-amber-50 text-amber-600 border-amber-200',
  PACKED: 'bg-orange-50 text-orange-600 border-orange-200',
  SHIPMENT_CREATED: 'bg-purple-50 text-purple-600 border-purple-200',
  SHIPPED: 'bg-cyan-50 text-cyan-600 border-cyan-200',
  OUT_FOR_DELIVERY: 'bg-teal-50 text-teal-600 border-teal-200',
  DELIVERED: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  CANCELLED: 'bg-red-50 text-red-600 border-red-200',
  PAYMENT_FAILED: 'bg-red-50 text-red-600 border-red-200',
  REFUNDED: 'bg-gray-50 text-gray-500 border-gray-200',
  FAILED: 'bg-red-50 text-red-600 border-red-200',
  CREATING: 'bg-yellow-50 text-yellow-600 border-yellow-200',
  CREATED: 'bg-purple-50 text-purple-600 border-purple-200',
  IN_TRANSIT: 'bg-orange-50 text-orange-600 border-orange-200',
};

type Tab = 'to-ship' | 'shipped' | 'cancelled';

export const AdminOrders = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();
  const [syncingIds, setSyncingIds] = useState<Set<string>>(new Set());
  const [printingLabel, setPrintingLabel] = useState<string | null>(null);
  const [cancelModal, setCancelModal] = useState<{ orderId: string; orderName: string } | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const navigate = useNavigate();

  const activeTab: Tab = (searchParams.get('tab') as Tab) || 'to-ship';

  const setTab = (tab: Tab) => setSearchParams({ tab });

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/orders');
      let data = Array.isArray(res.data) ? res.data : res.data.orders || [];

      if (search) {
        const q = search.toLowerCase();
        data = data.filter((o: any) =>
          o.id?.toLowerCase().includes(q) ||
          o.shippingAddress?.fullName?.toLowerCase().includes(q) ||
          o.customer?.email?.toLowerCase().includes(q)
        );
      }
      setOrders(data);

      // Auto-sync tracking for shipped orders
      const shippedOrders = data.filter((o: any) =>
        ['SHIPPED', 'OUT_FOR_DELIVERY', 'SHIPMENT_CREATED'].includes(o.status) && o.shipping?.awb
      );
      if (shippedOrders.length > 0) autoSyncTracking(shippedOrders);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { fetchOrders(); }, []);

  const autoSyncTracking = async (shippedOrders: any[]) => {
    const fiveMinAgo = Date.now() - 5 * 60 * 1000;
    const needSync = shippedOrders.filter(o => {
      const lastSync = o.shipping?.lastSyncedAt ? new Date(o.shipping.lastSyncedAt).getTime() : 0;
      return lastSync < fiveMinAgo;
    });
    if (needSync.length === 0) return;
    for (const order of needSync.slice(0, 10)) {
      try { await api.get(`/admin/orders/${order.id}/shipment/sync`); } catch {}
    }
    fetchOrders();
  };

  const handleSync = async (orderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSyncingIds(prev => new Set(prev).add(orderId));
    try {
      await api.get(`/admin/orders/${orderId}/shipment/sync`);
      fetchOrders();
    } catch (err) { console.error('Sync failed:', err); }
    finally {
      setSyncingIds(prev => { const next = new Set(prev); next.delete(orderId); return next; });
    }
  };

  const handlePrintLabel = async (orderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPrintingLabel(orderId);
    try {
      const res = await api.get(`/admin/orders/${orderId}/shipment/label`, { responseType: 'blob' });
      const contentType = res.headers?.['content-type'] || '';
      if (contentType.includes('application/json')) {
        const order = orders.find(o => o.id === orderId);
        if (order?.shipping?.trackingUrl) window.open(order.shipping.trackingUrl, '_blank');
        return;
      }
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const win = window.open(url, '_blank');
      if (win) win.onload = () => win.print();
    } catch (err: any) {
      const order = orders.find(o => o.id === orderId);
      if (order?.shipping?.trackingUrl) window.open(order.shipping.trackingUrl, '_blank');
    } finally { setPrintingLabel(null); }
  };

  const handleCreateShipment = async (orderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try { await api.post(`/admin/orders/${orderId}/shipment`); fetchOrders(); }
    catch (err) { console.error('Create shipment failed:', err); }
  };

  const handleCancelOrder = async () => {
    if (!cancelModal || !cancelReason.trim()) return;
    setCancelling(true);
    try {
      await api.put(`/admin/orders/${cancelModal.orderId}/status`, {
        status: 'CANCELLED',
        cancelReason: cancelReason.trim(),
        cancelledBy: 'admin'
      });
      setCancelModal(null);
      setCancelReason('');
      fetchOrders();
    } catch (err) { console.error('Cancel failed:', err); }
    finally { setCancelling(false); }
  };

  // Categorize orders
  const needToShipOrders = orders.filter(o =>
    ['PLACED', 'CONFIRMED', 'PROCESSING', 'PACKED', 'SHIPMENT_CREATED', 'FAILED'].includes(o.status)
  );
  const shippedOrders = orders.filter(o =>
    ['SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(o.status) ||
    (o.shipping?.awb && !['CANCELLED', 'REFUNDED'].includes(o.status))
  );
  const cancelledOrders = orders.filter(o =>
    ['CANCELLED', 'PAYMENT_FAILED', 'REFUNDED'].includes(o.status)
  );

  const tabOrders = activeTab === 'to-ship' ? needToShipOrders
    : activeTab === 'shipped' ? shippedOrders
    : cancelledOrders;

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
            <p className="text-sm text-gray-500 mt-0.5">Manage and track all customer orders</p>
          </div>
          <button onClick={fetchOrders} className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg hover:bg-white transition-colors">
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        {/* Analytics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <button onClick={() => setTab('to-ship')} className={`rounded-xl p-4 text-left transition-all ${activeTab === 'to-ship' ? 'bg-orange-50 border-2 border-orange-300 shadow-sm' : 'bg-white border border-gray-100 hover:border-gray-200'}`}>
            <div className="flex items-center gap-2 mb-1">
              <Package size={16} className={activeTab === 'to-ship' ? 'text-orange-500' : 'text-gray-400'} />
              <span className="text-xs font-medium text-gray-500">Need to Ship</span>
            </div>
            <p className={`text-2xl font-bold ${activeTab === 'to-ship' ? 'text-orange-600' : 'text-gray-900'}`}>{needToShipOrders.length}</p>
          </button>
          <button onClick={() => setTab('shipped')} className={`rounded-xl p-4 text-left transition-all ${activeTab === 'shipped' ? 'bg-cyan-50 border-2 border-cyan-300 shadow-sm' : 'bg-white border border-gray-100 hover:border-gray-200'}`}>
            <div className="flex items-center gap-2 mb-1">
              <Truck size={16} className={activeTab === 'shipped' ? 'text-cyan-500' : 'text-gray-400'} />
              <span className="text-xs font-medium text-gray-500">Shipped</span>
            </div>
            <p className={`text-2xl font-bold ${activeTab === 'shipped' ? 'text-cyan-600' : 'text-gray-900'}`}>{shippedOrders.length}</p>
          </button>
          <button onClick={() => setTab('cancelled')} className={`rounded-xl p-4 text-left transition-all ${activeTab === 'cancelled' ? 'bg-red-50 border-2 border-red-300 shadow-sm' : 'bg-white border border-gray-100 hover:border-gray-200'}`}>
            <div className="flex items-center gap-2 mb-1">
              <XCircle size={16} className={activeTab === 'cancelled' ? 'text-red-500' : 'text-gray-400'} />
              <span className="text-xs font-medium text-gray-500">Cancelled</span>
            </div>
            <p className={`text-2xl font-bold ${activeTab === 'cancelled' ? 'text-red-600' : 'text-gray-900'}`}>{cancelledOrders.length}</p>
          </button>
          <div className="bg-white border border-gray-100 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 size={16} className="text-emerald-400" />
              <span className="text-xs font-medium text-gray-500">Total Orders</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{orders.length}</p>
          </div>
        </div>

        {/* Search */}
        <div className="flex gap-3 mb-5">
          <div className="relative flex-1 min-w-[250px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              placeholder="Search order ID, customer name..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && fetchOrders()}
            />
          </div>
          <button onClick={fetchOrders} className="flex items-center gap-1.5 px-4 py-2 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <Search size={14} /> Search
          </button>
        </div>

        {/* Orders List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-10 h-10 border-3 border-gray-200 border-t-primary rounded-full animate-spin" />
          </div>
        ) : tabOrders.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
            {activeTab === 'to-ship' ? <Package size={48} className="mx-auto mb-4 text-gray-200" /> :
             activeTab === 'shipped' ? <Truck size={48} className="mx-auto mb-4 text-gray-200" /> :
             <XCircle size={48} className="mx-auto mb-4 text-gray-200" />}
            <p className="text-gray-500 mb-1">
              {activeTab === 'to-ship' ? 'All caught up! No orders waiting to ship.' :
               activeTab === 'shipped' ? 'No shipped orders yet.' :
               'No cancelled orders.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {tabOrders.map(order => (
              <OrderCard
                key={order.id}
                order={order}
                tab={activeTab}
                onNavigate={() => navigate(`/admin/orders/${order.id}`)}
                onSync={handleSync}
                onPrintLabel={handlePrintLabel}
                onCreateShipment={handleCreateShipment}
                onCancel={(id, name) => setCancelModal({ orderId: id, orderName: name })}
                syncing={syncingIds.has(order.id)}
                printing={printingLabel === order.id}
              />
            ))}
          </div>
        )}

        {!loading && tabOrders.length > 0 && (
          <div className="mt-4 text-sm text-gray-400 text-center">{tabOrders.length} order{tabOrders.length !== 1 ? 's' : ''}</div>
        )}

        {/* Cancel Modal */}
        {cancelModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setCancelModal(null)}>
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertTriangle size={20} className="text-red-500" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Cancel Order</h3>
                  <p className="text-sm text-gray-500">#{cancelModal.orderName}</p>
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Cancellation Reason *</label>
                <textarea
                  value={cancelReason}
                  onChange={e => setCancelReason(e.target.value)}
                  placeholder="Enter reason for cancellation..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                />
                <p className="text-xs text-gray-400 mt-1">This reason will be visible to the customer.</p>
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={() => { setCancelModal(null); setCancelReason(''); }} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
                  Keep Order
                </button>
                <button
                  onClick={handleCancelOrder}
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
    </AdminLayout>
  );
};

// ─── Order Card ───────────────────────────────────────────────────────────
const OrderCard = ({
  order, tab, onNavigate, onSync, onPrintLabel, onCreateShipment, onCancel, syncing, printing
}: {
  order: any; tab: Tab; onNavigate: () => void;
  onSync: (id: string, e: React.MouseEvent) => void;
  onPrintLabel: (id: string, e: React.MouseEvent) => void;
  onCreateShipment: (id: string, e: React.MouseEvent) => void;
  onCancel: (id: string, name: string) => void;
  syncing: boolean; printing: boolean;
}) => {
  const hasShipment = !!order.shipping?.awb;
  const canCancel = ['PLACED', 'CONFIRMED', 'PROCESSING'].includes(order.status);
  const cancelReason = order.cancelReason || order.cancellationReason;

  return (
    <div
      onClick={onNavigate}
      className="bg-white rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-md transition-all cursor-pointer overflow-hidden"
    >
      <div className="p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          {/* Order Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="font-mono text-sm font-semibold text-gray-900">#{order.id?.slice(-8).toUpperCase()}</span>
              <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium border ${STATUS_COLORS[order.status] || 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                {order.status?.replace(/_/g, ' ')}
              </span>
              {order.paymentStatus === 'captured' && (
                <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-emerald-50 text-emerald-600 border border-emerald-200">Paid</span>
              )}
              {tab === 'cancelled' && (
                <>
                  {order.cancelledBy && (
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium border ${
                      order.cancelledBy === 'admin' ? 'bg-purple-50 text-purple-600 border-purple-200' : 'bg-orange-50 text-orange-600 border-orange-200'
                    }`}>
                      {order.cancelledBy === 'admin' ? 'Admin Cancelled' : 'Customer Cancelled'}
                    </span>
                  )}
                </>
              )}
            </div>
            <p className="text-sm text-gray-700 font-medium">{order.shippingAddress?.fullName || 'Customer'}</p>
            <p className="text-xs text-gray-400 mt-0.5">{order.customer?.email || ''}</p>
          </div>

          {/* Meta */}
          <div className="flex items-center gap-6 shrink-0">
            <div className="text-right">
              <p className="text-sm font-bold text-gray-900">₹{Number(order.total || 0).toLocaleString('en-IN')}</p>
              <p className="text-xs text-gray-400">{order.items?.length || 0} item{(order.items?.length || 0) !== 1 ? 's' : ''}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400">{order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {tab === 'to-ship' && (
              <>
                {hasShipment ? (
                  <span className="text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded-lg font-medium">AWB: {order.shipping.awb?.slice(0, 12)}...</span>
                ) : (
                  <button onClick={(e) => onCreateShipment(order.id, e)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors">
                    <Truck size={13} /> Create Shipment
                  </button>
                )}
                {canCancel && (
                  <button onClick={(e) => { e.stopPropagation(); onCancel(order.id, order.id?.slice(-8).toUpperCase()); }} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors">
                    <XCircle size={13} /> Cancel
                  </button>
                )}
              </>
            )}
            {tab === 'shipped' && hasShipment && (
              <>
                <button onClick={(e) => onSync(order.id, e)} disabled={syncing} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 disabled:opacity-50 transition-colors">
                  {syncing ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />} Sync
                </button>
                <button onClick={(e) => onPrintLabel(order.id, e)} disabled={printing} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 disabled:opacity-50 transition-colors">
                  {printing ? <Loader2 size={13} className="animate-spin" /> : <Printer size={13} />} Label
                </button>
                {order.shipping?.trackingUrl && (
                  <a href={order.shipping.trackingUrl} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                    <TruckIcon size={13} /> Track
                  </a>
                )}
              </>
            )}
            <ChevronRight size={16} className="text-gray-300 ml-1" />
          </div>
        </div>

        {/* Shipment bar */}
        {hasShipment && tab === 'shipped' && (
          <div className="mt-3 pt-3 border-t border-gray-50 flex flex-wrap items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1"><Truck size={12} /> {order.shipping.courierName || 'Courier'}</span>
            <span className="font-mono">{order.shipping.awb}</span>
            <span className={`px-2 py-0.5 rounded-full font-medium border ${STATUS_COLORS[order.shipmentStatus] || 'bg-gray-50 text-gray-500 border-gray-200'}`}>
              {order.shipmentStatus?.replace(/_/g, ' ') || 'Pending'}
            </span>
          </div>
        )}

        {/* Cancel reason bar */}
        {tab === 'cancelled' && (cancelReason || order.cancelledBy) && (
          <div className="mt-3 pt-3 border-t border-red-50 flex flex-wrap items-center gap-3 text-xs">
            {order.cancelledBy && (
              <span className={`px-2 py-0.5 rounded-full font-medium border ${
                order.cancelledBy === 'admin' ? 'bg-purple-50 text-purple-600 border-purple-200' : 'bg-orange-50 text-orange-600 border-orange-200'
              }`}>
                {order.cancelledBy === 'admin' ? 'Cancelled by Admin' : 'Cancelled by Customer'}
              </span>
            )}
            {cancelReason && (
              <span className="text-red-600"><strong>Reason:</strong> {cancelReason}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminOrders;
