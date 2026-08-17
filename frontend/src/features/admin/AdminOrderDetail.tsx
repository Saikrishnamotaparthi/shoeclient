import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '@/services/api';
import AdminLayout from '@/layouts/AdminLayout';
import { Truck, Package, Loader2, CheckCircle, AlertCircle, ExternalLink, ChevronDown, MapPin, Clock, Scale, Box } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  PLACED: 'bg-blue-100 text-blue-700',
  CONFIRMED: 'bg-indigo-100 text-indigo-700',
  PROCESSING: 'bg-yellow-100 text-yellow-700',
  PACKED: 'bg-orange-100 text-orange-700',
  SHIPMENT_CREATED: 'bg-purple-100 text-purple-700',
  SHIPPED: 'bg-cyan-100 text-cyan-700',
  OUT_FOR_DELIVERY: 'bg-teal-100 text-teal-700',
  DELIVERED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
  PAYMENT_FAILED: 'bg-red-100 text-red-700',
  REFUNDED: 'bg-gray-100 text-gray-500',
};

const TIMELINE_STEPS = [
  { key: 'PLACED', label: 'Order Placed' },
  { key: 'CONFIRMED', label: 'Payment Confirmed' },
  { key: 'PROCESSING', label: 'Processing' },
  { key: 'PACKED', label: 'Packed' },
  { key: 'SHIPPED', label: 'Shipped' },
  { key: 'OUT_FOR_DELIVERY', label: 'Out for Delivery' },
  { key: 'DELIVERED', label: 'Delivered' },
];

const formatCurrency = (amount: number) =>
  `₹${Number(amount || 0).toLocaleString('en-IN')}`;

const formatDate = (d?: string) =>
  d ? new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

interface ShippingRate {
  provider: string;
  courierName: string;
  rate: number;
  estimatedDays: string;
  codAvailable: boolean;
  rating: number | null;
}

export const AdminOrderDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState('');
  const [actionError, setActionError] = useState('');

  // Shipment booking state
  const [showShipForm, setShowShipForm] = useState(false);
  const [shipWeight, setShipWeight] = useState('0.5');
  const [shipLength, setShipLength] = useState('30');
  const [shipBreadth, setShipBreadth] = useState('20');
  const [shipHeight, setShipHeight] = useState('12');
  const [rates, setRates] = useState<ShippingRate[]>([]);
  const [ratesLoading, setRatesLoading] = useState(false);
  const [ratesError, setRatesError] = useState('');
  const [selectedRate, setSelectedRate] = useState<ShippingRate | null>(null);
  const [bookingShipment, setBookingShipment] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [labelLoading, setLabelLoading] = useState(false);

  const fetchOrder = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/admin/orders/${id}`);
      setOrder(res.data);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to load order.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchOrder(); }, [fetchOrder]);

  const updateStatus = async (status: string) => {
    if (!id) return;
    setActionLoading(status);
    setActionError('');
    try {
      await api.put(`/admin/orders/${id}/status`, { status });
      await fetchOrder();
    } catch (e: any) {
      setActionError(e.response?.data?.message || `Failed to update status to ${status}.`);
    } finally {
      setActionLoading('');
    }
  };

  // Fetch shipping rates
  const fetchRates = async () => {
    if (!id) return;
    setRatesLoading(true);
    setRatesError('');
    setRates([]);
    setSelectedRate(null);
    try {
      const res = await api.get(`/admin/orders/${id}/shipment/rates`, {
        params: { weight: shipWeight, length: shipLength, breadth: shipBreadth, height: shipHeight }
      });
      setRates(res.data.rates || []);
      if (res.data.rates?.length > 0) {
        setSelectedRate(res.data.rates[0]);
      }
    } catch (e: any) {
      setRatesError(e.response?.data?.error || 'Failed to fetch shipping rates.');
    } finally {
      setRatesLoading(false);
    }
  };

  // Book shipment
  const handleBookShipment = async () => {
    if (!id || !selectedRate) return;
    setBookingShipment(true);
    setBookingError('');
    setBookingSuccess(false);
    try {
      await api.post(`/admin/orders/${id}/shipment`, {
        provider: selectedRate.provider,
        weight: shipWeight,
        length: shipLength,
        breadth: shipBreadth,
        height: shipHeight,
      });
      setBookingSuccess(true);
      setShowShipForm(false);
      await fetchOrder();
    } catch (e: any) {
      setBookingError(e.response?.data?.error || 'Failed to book shipment.');
    } finally {
      setBookingShipment(false);
    }
  };

  // Sync tracking
  const handleSyncTracking = async () => {
    if (!id) return;
    setSyncing(true);
    try {
      await api.get(`/admin/orders/${id}/shipment/sync`);
      await fetchOrder();
    } catch {} finally {
      setSyncing(false);
    }
  };

  // Cancel current shipment and open rebook form
  const [cancellingShipment, setCancellingShipment] = useState(false);
  const handleChangeProvider = async () => {
    if (!id) return;
    if (!window.confirm('This will cancel the current shipment. Continue?')) return;
    setCancellingShipment(true);
    try {
      await api.post(`/admin/orders/${id}/shipment/cancel`);
      setBookingSuccess(false);
      setBookingError('');
      setShowShipForm(true);
      setRates([]);
      setSelectedRate(null);
      await fetchOrder();
    } catch (e: any) {
      setBookingError(e.response?.data?.error || 'Failed to cancel shipment.');
    } finally {
      setCancellingShipment(false);
    }
  };

  // Rebook failed/cancelled shipment
  const handleRebook = () => {
    setBookingSuccess(false);
    setBookingError('');
    setShowShipForm(true);
    setRates([]);
    setSelectedRate(null);
  };

  /* ─── helpers ─── */
  const currentStepIndex = order
    ? TIMELINE_STEPS.findIndex((s) => s.key === order.status)
    : -1;

  const isTerminal = order?.status === 'CANCELLED' || order?.status === 'REFUNDED' || order?.status === 'DELIVERED';
  const hasShipment = !!(order?.shipping?.awb || order?.shipment?.awb || order?.shipment?.provider || order?.shipmentStatus === 'AWB_ASSIGNED' || order?.shipmentStatus === 'IN_TRANSIT');
  const shipmentStatus = order?.shipment?.status || order?.shipmentStatus;
  const isShipmentFailed = shipmentStatus === 'FAILED';
  const isShipmentCancelled = shipmentStatus === 'CANCELLED';
  const isShipmentActive = hasShipment && !isShipmentFailed && !isShipmentCancelled;
  const canBookShipment = order && (order.status === 'PACKED' || order.status === 'CONFIRMED' || order.status === 'PROCESSING') && (!hasShipment || isShipmentFailed || isShipmentCancelled);

  /* ─── loading / error states ─── */
  if (loading) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center py-40">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
        </div>
      </AdminLayout>
    );
  }

  if (error || !order) {
    return (
      <AdminLayout>
        <div className="p-8 text-center">
          <p className="text-red-600 mb-4">{error || 'Order not found.'}</p>
          <button onClick={() => navigate('/admin/orders')} className="px-4 py-2 text-sm border border-border rounded hover:bg-surface">
            Back to Orders
          </button>
        </div>
      </AdminLayout>
    );
  }

  /* ─── Admin action buttons based on status ─── */
  const renderActions = () => {
    if (isTerminal) return null;

    const buttons: { label: string; status: string; color: string }[] = [];

    switch (order.status) {
      case 'PLACED':
        buttons.push({ label: 'Confirm Order', status: 'CONFIRMED', color: 'bg-indigo-600 hover:bg-indigo-700' });
        break;
      case 'CONFIRMED':
        buttons.push({ label: 'Start Processing', status: 'PROCESSING', color: 'bg-yellow-600 hover:bg-yellow-700' });
        break;
      case 'PROCESSING':
        buttons.push({ label: 'Mark Packed', status: 'PACKED', color: 'bg-orange-600 hover:bg-orange-700' });
        break;
      case 'PACKED':
        // No status button — admin must book shipment first (shown in shipment section below)
        break;
      case 'SHIPMENT_CREATED':
        buttons.push({ label: 'Mark Shipped', status: 'SHIPPED', color: 'bg-cyan-600 hover:bg-cyan-700' });
        break;
      case 'SHIPPED':
        buttons.push({ label: 'Out for Delivery', status: 'OUT_FOR_DELIVERY', color: 'bg-teal-600 hover:bg-teal-700' });
        break;
      case 'OUT_FOR_DELIVERY':
        buttons.push({ label: 'Mark Delivered', status: 'DELIVERED', color: 'bg-green-600 hover:bg-green-700' });
        break;
      default:
        break;
    }

    if (order.status !== 'CANCELLED' && order.status !== 'REFUNDED') {
      buttons.push({ label: 'Cancel Order', status: 'CANCELLED', color: 'bg-red-600 hover:bg-red-700' });
    }
    if (order.paymentStatus === 'captured' && order.status !== 'REFUNDED') {
      buttons.push({ label: 'Refund', status: 'REFUNDED', color: 'bg-gray-600 hover:bg-gray-700' });
    }

    return (
      <div className="flex flex-wrap gap-2">
        {buttons.map((b) => (
          <button
            key={b.status}
            disabled={!!actionLoading}
            onClick={() => updateStatus(b.status)}
            className={`px-4 py-2 text-sm text-white rounded font-medium transition-colors disabled:opacity-50 ${b.color}`}
          >
            {actionLoading === b.status ? 'Updating…' : b.label}
          </button>
        ))}
      </div>
    );
  };

  /* ─── Timeline ─── */
  const renderTimeline = () => {
    if (order.status === 'CANCELLED' || order.status === 'REFUNDED') {
      return (
        <div className="flex items-center gap-3 py-4">
          <span className={`text-xs px-3 py-1 rounded font-medium ${STATUS_COLORS[order.status] || ''}`}>
            {order.status.replace('_', ' ')}
          </span>
          <span className="text-sm text-text-muted">
            {order.status === 'CANCELLED' ? 'This order has been cancelled.' : 'This order has been refunded.'}
          </span>
        </div>
      );
    }

    return (
      <div className="relative pl-6">
        {TIMELINE_STEPS.map((step, idx) => {
          const isCompleted = currentStepIndex >= 0 && idx <= currentStepIndex;
          const isCurrent = idx === currentStepIndex;
          const isLast = idx === TIMELINE_STEPS.length - 1;
          const ts = order.timeline?.[step.key] || (idx === 0 ? order.createdAt : undefined);

          return (
            <div key={step.key} className="relative pb-6 last:pb-0">
              {!isLast && (
                <div className={`absolute left-[7px] top-5 w-0.5 h-[calc(100%-8px)] ${isCompleted ? 'bg-primary' : 'bg-gray-200'}`} />
              )}
              <div className={`absolute left-0 top-1 w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                isCurrent ? 'border-primary bg-primary' : isCompleted ? 'border-primary bg-white' : 'border-gray-300 bg-white'
              }`}>
                {isCompleted && !isCurrent && <div className="w-2 h-2 rounded-full bg-primary" />}
              </div>
              <div className="ml-6">
                <p className={`text-sm font-medium ${isCurrent ? 'text-primary' : isCompleted ? 'text-gray-800' : 'text-gray-400'}`}>
                  {step.label}
                  {isCurrent && <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">Current</span>}
                </p>
                {ts && <p className="text-xs text-text-muted mt-0.5">{formatDate(ts)}</p>}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  /* ─── Print Invoice ─── */
  const handlePrintInvoice = () => {
    const items = order.items || [];
    const invoiceHtml = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Invoice #${order.id?.slice(-8).toUpperCase()}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; color: #1a1a1a; }
  .header { display: flex; justify-content: space-between; margin-bottom: 30px; border-bottom: 2px solid #1a1a1a; padding-bottom: 20px; }
  .brand { font-size: 24px; font-weight: 700; } .brand span { color: #6366f1; }
  .invoice-info { text-align: right; } .invoice-info h2 { font-size: 20px; margin-bottom: 5px; }
  .invoice-info p { font-size: 12px; color: #666; }
  .section { margin-bottom: 20px; } .section h3 { font-size: 12px; text-transform: uppercase; color: #888; margin-bottom: 8px; letter-spacing: 1px; }
  .section p { font-size: 13px; line-height: 1.6; }
  .grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin-bottom: 30px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  th { background: #f5f5f5; text-align: left; padding: 10px 12px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #ddd; }
  td { padding: 10px 12px; font-size: 13px; border-bottom: 1px solid #eee; }
  .totals { text-align: right; margin-top: 20px; } .totals div { margin-bottom: 6px; font-size: 13px; }
  .totals .total { font-size: 18px; font-weight: 700; border-top: 2px solid #1a1a1a; padding-top: 10px; margin-top: 10px; }
  .footer { margin-top: 40px; text-align: center; font-size: 11px; color: #999; border-top: 1px solid #eee; padding-top: 20px; }
  @media print { body { padding: 20px; } }
</style></head><body>
<div class="header">
  <div class="brand">Sole<span>Vault</span></div>
  <div class="invoice-info">
    <h2>INVOICE</h2>
    <p>Order #${order.id?.slice(-8).toUpperCase()}</p>
    <p>Date: ${new Date(order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
  </div>
</div>
<div class="grid">
  <div class="section"><h3>Bill To</h3><p>${shipping.fullName || '—'}<br>${shipping.phone ? '+91 ' + shipping.phone : ''}<br>${shipping.email || customer.email || ''}</p></div>
  <div class="section"><h3>Ship To</h3><p>${shipping.street || shipping.addressLine1 || '—'}<br>${shipping.landmark ? shipping.landmark + '<br>' : ''}${[shipping.city, shipping.state, shipping.pincode].filter(Boolean).join(', ')}</p></div>
  <div class="section"><h3>Payment</h3><p>Method: ${order.paymentMethod || '—'}<br>Status: ${order.paymentStatus || '—'}<br>${order.paymentId ? 'ID: ' + order.paymentId : ''}</p></div>
</div>
<table><thead><tr><th>Item</th><th>Size</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead><tbody>
${items.map((i: any) => `<tr><td>${i.name || 'Product'}</td><td>${i.size || '—'}</td><td>${i.quantity || 1}</td><td>₹${(i.price || 0).toLocaleString('en-IN')}</td><td>₹${((i.price || 0) * (i.quantity || 1)).toLocaleString('en-IN')}</td></tr>`).join('')}
</tbody></table>
<div class="totals">
  <div>Subtotal: ₹${(order.subtotal || 0).toLocaleString('en-IN')}</div>
  ${order.discount > 0 ? `<div style="color:#16a34a">Discount: -₹${order.discount.toLocaleString('en-IN')}</div>` : ''}
  <div>Shipping: ${order.shippingFee > 0 ? '₹' + order.shippingFee.toLocaleString('en-IN') : 'Free'}</div>
  <div class="total">Total: ₹${(order.total || 0).toLocaleString('en-IN')}</div>
</div>
<div class="footer"><p>Thank you for shopping with SoleVault!</p><p>support@solevault.com | solevault.com</p></div>
</body></html>`;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(invoiceHtml);
      printWindow.document.close();
      setTimeout(() => printWindow.print(), 500);
    }
  };

  /* ─── Print Label ─── */
  const handlePrintLabel = async () => {
    if (!id) return;
    setLabelLoading(true);
    try {
      const res = await api.get(`/admin/orders/${id}/shipment/label`, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch {
      // Fallback: open tracking URL if label not available
      const trackingUrl = shipment.trackingUrl || order.shipping?.trackingUrl;
      if (trackingUrl) {
        window.open(trackingUrl, '_blank');
      } else {
        setActionError('Label not available. Shipment may not have been processed yet.');
      }
    } finally {
      setLabelLoading(false);
    }
  };

  /* ─── Main render ─── */
  const customer = order.customer || {};
  const shipping = order.shippingAddress || {};
  const payment = order.payment || {};
  const shipment = order.shipment || {};

  return (
    <AdminLayout>
      <div className="p-8 max-w-6xl">
        {/* Back link */}
        <button onClick={() => navigate('/admin/orders')} className="text-sm text-text-muted hover:text-primary mb-4 inline-block">
          ← Back to Orders
        </button>

        {/* ── Header ── */}
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-display">
              Order <span className="font-mono text-lg">#{order.id?.slice(-8).toUpperCase()}</span>
            </h1>
            <p className="text-sm text-text-muted mt-1">Placed on {formatDate(order.createdAt)}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={handlePrintInvoice} className="px-4 py-2 text-sm border border-border rounded hover:bg-surface">
              Print Invoice
            </button>
            {hasShipment && (
              <button onClick={handlePrintLabel} disabled={labelLoading} className="px-4 py-2 text-sm border border-border rounded hover:bg-surface disabled:opacity-50">
                {labelLoading ? 'Loading...' : 'Print Label'}
              </button>
            )}
          </div>
        </div>

        {/* Action error */}
        {actionError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">{actionError}</div>
        )}

        {/* Booking success */}
        {bookingSuccess && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded text-sm text-green-700 flex items-center gap-2">
            <CheckCircle size={16} /> Shipment booked successfully!
          </div>
        )}

        {/* ── Admin Actions Bar ── */}
        <div className="bg-white border border-border rounded p-4 mb-6">
          <h2 className="text-sm font-semibold mb-3">Admin Actions</h2>
          {renderActions()}
          {isTerminal && <p className="text-sm text-text-muted mt-2">No further actions available.</p>}
        </div>

        {/* ── Info Grid ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white border border-border rounded p-5">
            <h2 className="text-sm font-semibold mb-3">Customer</h2>
            <div className="space-y-2 text-sm">
              <p><span className="text-text-muted">Name:</span> {shipping.fullName || customer.name || '—'}</p>
              <p><span className="text-text-muted">Email:</span> {customer.email || '—'}</p>
              <p><span className="text-text-muted">Phone:</span> {shipping.phone || customer.phone || '—'}</p>
            </div>
          </div>

          <div className="bg-white border border-border rounded p-5">
            <h2 className="text-sm font-semibold mb-3 flex items-center gap-2"><MapPin size={14} /> Shipping Address</h2>
            <div className="text-sm text-text-muted leading-relaxed">
              {shipping.street || shipping.addressLine1 ? (
                <>
                  <p className="text-gray-800 font-medium">{shipping.fullName}</p>
                  <p>{shipping.street || shipping.addressLine1}</p>
                  {shipping.landmark && <p>{shipping.landmark}</p>}
                  <p>{[shipping.city, shipping.state, shipping.pincode].filter(Boolean).join(', ')}</p>
                  {shipping.phone && <p className="mt-1">+91 {shipping.phone}</p>}
                </>
              ) : (
                <p>No shipping address on file.</p>
              )}
            </div>
          </div>

          <div className="bg-white border border-border rounded p-5">
            <h2 className="text-sm font-semibold mb-3">Payment</h2>
            <div className="space-y-2 text-sm">
              <p><span className="text-text-muted">Amount:</span> <span className="font-semibold">{formatCurrency(payment.amount || order.total)}</span></p>
              <p>
                <span className="text-text-muted">Status:</span>{' '}
                <span className={`text-xs px-2 py-0.5 rounded font-medium ${order.paymentStatus === 'captured' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                  {order.paymentStatus || 'pending'}
                </span>
              </p>
              <p><span className="text-text-muted">Method:</span> {payment.method || order.paymentMethod || '—'}</p>
            </div>
          </div>
        </div>

        {/* ── Items Table ── */}
        <div className="bg-white border border-border rounded overflow-hidden mb-6">
          <h2 className="text-sm font-semibold p-5 pb-0 mb-3">Order Items</h2>
          <table className="w-full text-sm text-left">
            <thead className="bg-[#F0F0F0]">
              <tr>
                <th className="p-3 font-semibold">Image</th>
                <th className="p-3 font-semibold">Product</th>
                <th className="p-3 font-semibold">Size</th>
                <th className="p-3 font-semibold">Qty</th>
                <th className="p-3 font-semibold">Price</th>
                <th className="p-3 font-semibold">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(order.items || []).map((item: any, idx: number) => (
                <tr key={idx} className="hover:bg-surface">
                  <td className="p-3">
                    {item.image ? (
                      <img src={item.image} alt={item.name} className="w-12 h-12 object-cover rounded" />
                    ) : (
                      <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center text-xs text-gray-400">—</div>
                    )}
                  </td>
                  <td className="p-3 font-medium">{item.name || 'Product'}</td>
                  <td className="p-3">{item.size || '—'}</td>
                  <td className="p-3">{item.quantity || 1}</td>
                  <td className="p-3">{formatCurrency(item.price)}</td>
                  <td className="p-3 font-semibold">{formatCurrency((item.price || 0) * (item.quantity || 1))}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-5 py-3 bg-surface border-t border-border flex justify-end gap-8 text-sm">
            <span className="text-text-muted">Subtotal: {formatCurrency(order.subtotal)}</span>
            {order.discount > 0 && <span className="text-green-600">Discount: -{formatCurrency(order.discount)}</span>}
            <span className="text-text-muted">Shipping: {formatCurrency(order.shippingFee)}</span>
            <span className="font-semibold text-base">Total: {formatCurrency(order.total)}</span>
          </div>
        </div>

        {/* ── Shipment Section ── */}
        <div className="bg-white border border-border rounded overflow-hidden mb-6">
          <div className="p-5 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-semibold flex items-center gap-2"><Truck size={16} /> Shipment</h2>
            <div className="flex gap-2">
              {/* Sync Tracking — only for active shipments */}
              {isShipmentActive && (
                <button
                  onClick={handleSyncTracking}
                  disabled={syncing}
                  className="px-3 py-1.5 text-xs border border-border rounded hover:bg-surface disabled:opacity-50 flex items-center gap-1"
                >
                  {syncing ? <Loader2 size={12} className="animate-spin" /> : <Clock size={12} />}
                  Sync Tracking
                </button>
              )}
              {/* Track — only for active shipments with tracking URL */}
              {isShipmentActive && (shipment.trackingUrl || order.shipping?.trackingUrl) && (
                <a href={shipment.trackingUrl || order.shipping?.trackingUrl} target="_blank" rel="noopener noreferrer"
                  className="px-3 py-1.5 text-xs border border-border rounded hover:bg-surface flex items-center gap-1"
                >
                  <ExternalLink size={12} /> Track
                </a>
              )}
              {/* Change Provider — for active shipments (not failed/cancelled) */}
              {isShipmentActive && (
                <button
                  onClick={handleChangeProvider}
                  disabled={cancellingShipment}
                  className="px-3 py-1.5 text-xs border border-orange-300 text-orange-600 rounded hover:bg-orange-50 disabled:opacity-50 flex items-center gap-1"
                >
                  {cancellingShipment ? <Loader2 size={12} className="animate-spin" /> : <Truck size={12} />}
                  Change Provider
                </button>
              )}
              {/* Rebook — for failed/cancelled shipments */}
              {(isShipmentFailed || isShipmentCancelled) && canBookShipment && (
                <button
                  onClick={handleRebook}
                  className="px-3 py-1.5 text-xs bg-primary text-white rounded hover:bg-primary/90 flex items-center gap-1"
                >
                  <Package size={12} /> Rebook Shipment
                </button>
              )}
            </div>
          </div>

          {/* Existing shipment info */}
          {hasShipment && !showShipForm && (
            <div className="p-5">
              {/* Failed shipment warning */}
              {(isShipmentFailed || isShipmentCancelled) && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700 flex items-start gap-2">
                  <AlertCircle size={14} className="mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium">Shipment {isShipmentFailed ? 'Failed' : 'Cancelled'}</p>
                    <p className="text-xs mt-1">This shipment could not be processed. You can rebook with a different provider.</p>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-text-muted text-xs uppercase tracking-wider mb-1">Provider</p>
                  <p className="font-medium">{shipment.provider || order.shipping?.provider || '—'}</p>
                </div>
                <div>
                  <p className="text-text-muted text-xs uppercase tracking-wider mb-1">AWB Number</p>
                  <p className="font-mono text-xs font-medium">{shipment.awb || order.shipping?.awb || '—'}</p>
                </div>
                <div>
                  <p className="text-text-muted text-xs uppercase tracking-wider mb-1">Courier</p>
                  <p className="font-medium">{shipment.courierName || order.shipping?.courierName || '—'}</p>
                </div>
                <div>
                  <p className="text-text-muted text-xs uppercase tracking-wider mb-1">Status</p>
                  <span className={`text-xs px-2 py-0.5 rounded font-medium ${STATUS_COLORS[shipment.status || order.shipmentStatus] || 'bg-gray-100 text-gray-500'}`}>
                    {(shipment.status || order.shipmentStatus || '—').replace(/_/g, ' ')}
                  </span>
                </div>
              </div>
              {/* Error info for failed shipments */}
              {isShipmentFailed && shipment.errorInfo && (
                <div className="mt-3 pt-3 border-t border-border/50">
                  <p className="text-xs text-text-muted">Error: {shipment.errorInfo}</p>
                </div>
              )}
              {/* Tracking URL for active shipments */}
              {isShipmentActive && (shipment.trackingUrl || order.shipping?.trackingUrl) && (
                <div className="mt-3 pt-3 border-t border-border/50">
                  <a href={shipment.trackingUrl || order.shipping?.trackingUrl} target="_blank" rel="noopener noreferrer"
                    className="text-sm text-primary underline hover:text-primary/80 flex items-center gap-1">
                    <ExternalLink size={12} /> Track Shipment
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Book Shipment Button — shown when no shipment and form not open */}
          {canBookShipment && !showShipForm && !hasShipment && (
            <div className="p-5">
              <button
                onClick={() => setShowShipForm(true)}
                className="px-5 py-2.5 bg-primary text-white text-sm font-semibold rounded hover:bg-primary/90 transition-colors flex items-center gap-2"
              >
                <Package size={16} /> Book Shipment
              </button>
            </div>
          )}

          {/* Book Shipment Form — shown when form is open */}
          {canBookShipment && showShipForm && (
            <div className="p-5">
              <div className="space-y-5">
                {/* Step 1: Package Details */}
                  <div>
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <Box size={14} /> Package Details
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-text-muted mb-1">Weight (kg) *</label>
                        <input type="number" step="0.1" min="0.1" value={shipWeight} onChange={e => setShipWeight(e.target.value)}
                          className="w-full border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-primary" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-text-muted mb-1">Length (cm) *</label>
                        <input type="number" min="1" value={shipLength} onChange={e => setShipLength(e.target.value)}
                          className="w-full border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-primary" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-text-muted mb-1">Breadth (cm) *</label>
                        <input type="number" min="1" value={shipBreadth} onChange={e => setShipBreadth(e.target.value)}
                          className="w-full border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-primary" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-text-muted mb-1">Height (cm) *</label>
                        <input type="number" min="1" value={shipHeight} onChange={e => setShipHeight(e.target.value)}
                          className="w-full border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-primary" />
                      </div>
                    </div>
                    <button
                      onClick={fetchRates}
                      disabled={ratesLoading}
                      className="mt-3 px-5 py-2 bg-primary text-white text-sm font-semibold rounded hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center gap-2"
                    >
                      {ratesLoading ? <><Loader2 size={14} className="animate-spin" /> Fetching Rates...</> : <><Scale size={14} /> Get Shipping Rates</>}
                    </button>
                  </div>

                  {/* Rates Error */}
                  {ratesError && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700 flex items-center gap-2">
                      <AlertCircle size={14} /> {ratesError}
                    </div>
                  )}

                  {/* Step 2: Rate Comparison */}
                  {rates.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                        <Scale size={14} /> Compare Shipping Rates
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {rates.map((rate, idx) => (
                          <div
                            key={idx}
                            onClick={() => setSelectedRate(rate)}
                            className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${
                              selectedRate === rate
                                ? 'border-primary bg-primary/5 shadow-sm'
                                : 'border-border hover:border-gray-300'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold ${
                                  rate.provider === 'SHADOWFAX' ? 'bg-orange-500' : 'bg-green-600'
                                }`}>
                                  {rate.provider === 'SHADOWFAX' ? 'SF' : 'DL'}
                                </div>
                                <div>
                                  <p className="text-sm font-semibold">{rate.courierName}</p>
                                  <p className="text-[11px] text-text-muted">{rate.provider}</p>
                                </div>
                              </div>
                              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                selectedRate === rate ? 'border-primary bg-primary text-white' : 'border-gray-300'
                              }`}>
                                {selectedRate === rate && <div className="w-2 h-2 bg-white rounded-full" />}
                              </div>
                            </div>
                            <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-border/50">
                              <div>
                                <p className="text-[10px] text-text-muted uppercase">Rate</p>
                                <p className="text-sm font-bold text-primary">{rate.rate > 0 ? formatCurrency(rate.rate) : 'Estimating...'}</p>
                              </div>
                              <div>
                                <p className="text-[10px] text-text-muted uppercase">Delivery</p>
                                <p className="text-sm font-medium">{rate.estimatedDays} days</p>
                              </div>
                              <div>
                                <p className="text-[10px] text-text-muted uppercase">COD</p>
                                <p className={`text-sm font-medium ${rate.codAvailable ? 'text-green-600' : 'text-red-500'}`}>
                                  {rate.codAvailable ? 'Available' : 'No'}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Book Button */}
                      <div className="mt-4 flex items-center gap-3">
                        <button
                          onClick={handleBookShipment}
                          disabled={!selectedRate || bookingShipment}
                          className="px-6 py-2.5 bg-primary text-white text-sm font-semibold rounded hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center gap-2"
                        >
                          {bookingShipment ? (
                            <><Loader2 size={14} className="animate-spin" /> Booking...</>
                          ) : (
                            <><Truck size={14} /> Book with {selectedRate?.courierName || 'Selected Provider'}</>
                          )}
                        </button>
                        <button
                          onClick={() => { setShowShipForm(false); setRates([]); setSelectedRate(null); }}
                          className="px-4 py-2.5 text-sm border border-border rounded hover:bg-surface"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Booking Error */}
                  {bookingError && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700 flex items-center gap-2">
                      <AlertCircle size={14} /> {bookingError}
                    </div>
                  )}
                </div>
            </div>
          )}

          {/* No shipment and can't book */}
          {!hasShipment && !canBookShipment && (
            <div className="p-5 text-sm text-text-muted">
              Shipment can be booked after the order is packed.
            </div>
          )}
        </div>

        {/* ── Order Timeline ── */}
        <div className="bg-white border border-border rounded p-5 mb-6">
          <h2 className="text-sm font-semibold mb-4">Order Timeline</h2>
          {renderTimeline()}
        </div>
      </div>
    </AdminLayout>
  );
};
