import React, { useState } from 'react';
import api from '@/services/api';
import { Search, Package, MapPin, Truck, Clock, CheckCircle, XCircle } from 'lucide-react';

interface TrackingResult {
  order: {
    id: string;
    status: string;
    createdAt: string;
    items: { name: string; quantity: number }[];
    total: number;
  };
  shipment?: {
    awb?: string;
    courierName?: string;
    trackingUrl?: string;
    status: string;
  };
}

const TIMELINE_STEPS = [
  { status: 'PLACED', label: 'Order Placed', icon: '🛒' },
  { status: 'CONFIRMED', label: 'Confirmed', icon: '✅' },
  { status: 'PROCESSING', label: 'Processing', icon: '⚙️' },
  { status: 'PACKED', label: 'Packed', icon: '📦' },
  { status: 'SHIPPED', label: 'Shipped', icon: '🚚' },
  { status: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', icon: '🏠' },
  { status: 'DELIVERED', label: 'Delivered', icon: '🎉' },
];

const STATUS_ORDER = TIMELINE_STEPS.map(t => t.status);

const STATUS_COLORS: Record<string, string> = {
  PLACED: 'bg-gray-100 text-gray-700',
  CONFIRMED: 'bg-blue-100 text-blue-700',
  PROCESSING: 'bg-amber-100 text-amber-700',
  PACKED: 'bg-amber-100 text-amber-700',
  SHIPPED: 'bg-blue-100 text-blue-700',
  OUT_FOR_DELIVERY: 'bg-purple-100 text-purple-700',
  DELIVERED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-600',
};

const TrackOrderPage: React.FC = () => {
  const [orderId, setOrderId] = useState('');
  const [phone, setPhone] = useState('');
  const [result, setResult] = useState<TrackingResult | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResult(null);
    setLoading(true);
    try {
      const res = await api.get(`/orders/track?orderId=${orderId.trim()}&phone=${phone.trim()}`);
      setResult(res.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Order not found. Please check the details and try again.');
    } finally {
      setLoading(false);
    }
  };

  const statusIdx = result ? STATUS_ORDER.indexOf(result.order.status) : -1;

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="text-center mb-8">
        <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Truck size={24} className="text-primary" />
        </div>
        <h1 className="text-3xl font-display font-semibold mb-2">Track Your Order</h1>
        <p className="text-text-muted">Enter your order ID and phone number to track your delivery.</p>
      </div>

      {/* Form */}
      <div className="bg-white border border-border rounded-xl p-6 mb-6">
        {error && (
          <div className="mb-4 flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded">
            <XCircle size={16} /> {error}
          </div>
        )}
        <form onSubmit={handleTrack} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5" htmlFor="track-order-id">
              Order ID <span className="text-danger">*</span>
            </label>
            <input
              id="track-order-id"
              type="text"
              value={orderId}
              onChange={e => setOrderId(e.target.value)}
              required
              placeholder="e.g. ABC12345"
              className="w-full border border-border rounded px-4 py-2.5 text-sm focus:outline-none focus:border-primary uppercase"
            />
            <p className="text-xs text-text-muted mt-1">Found in your order confirmation email.</p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5" htmlFor="track-phone">
              Mobile Number <span className="text-danger">*</span>
            </label>
            <input
              id="track-phone"
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
              required
              placeholder="10-digit mobile number"
              className="w-full border border-border rounded px-4 py-2.5 text-sm focus:outline-none focus:border-primary"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 bg-primary text-white rounded font-semibold text-sm hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            <Search size={16} />
            {loading ? 'Tracking…' : 'Track Order'}
          </button>
        </form>
      </div>

      {/* Results */}
      {result && (
        <div className="space-y-4">
          {/* Status */}
          <div className="bg-white border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold">Order #{result.order.id.slice(-8).toUpperCase()}</h2>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLORS[result.order.status] || 'bg-gray-100 text-gray-600'}`}>
                {result.order.status.replace(/_/g, ' ')}
              </span>
            </div>
            <p className="text-xs text-text-muted">
              Placed {new Date(result.order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>

          {/* Timeline */}
          {!['CANCELLED', 'PAYMENT_FAILED'].includes(result.order.status) && (
            <div className="bg-white border border-border rounded-xl p-5">
              <h3 className="font-semibold text-sm mb-4 flex items-center gap-2"><Clock size={14} /> Delivery Progress</h3>
              <div className="space-y-3">
                {TIMELINE_STEPS.map((step, idx) => {
                  const isDone = statusIdx >= idx;
                  const isCurrent = statusIdx === idx;
                  return (
                    <div key={step.status} className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0 transition-colors ${
                        isDone ? 'bg-primary text-white' : 'bg-surface border-2 border-border text-text-muted'
                      }`}>
                        {isDone ? '✓' : step.icon}
                      </div>
                      <span className={`text-sm ${isCurrent ? 'text-primary font-semibold' : isDone ? 'text-text' : 'text-text-muted'}`}>
                        {step.label}
                      </span>
                      {isCurrent && <span className="text-xs text-primary font-medium bg-primary/10 px-2 py-0.5 rounded-full">Current</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Shipment info */}
          {result.shipment?.awb && (
            <div className="bg-white border border-border rounded-xl p-5">
              <h3 className="font-semibold text-sm mb-3 flex items-center gap-2"><Package size={14} /> Shipment Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex gap-2"><span className="text-text-muted">AWB:</span> <span className="font-mono">{result.shipment.awb}</span></div>
                {result.shipment.courierName && (
                  <div className="flex gap-2"><span className="text-text-muted">Courier:</span> <span>{result.shipment.courierName}</span></div>
                )}
                {result.shipment.trackingUrl && (
                  <a
                    href={result.shipment.trackingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary font-medium hover:underline mt-1"
                  >
                    View on Courier Website →
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TrackOrderPage;
