import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { orderService } from '@/services/orderService';
import type { ReturnRequest } from '@/types';
import api from '@/services/api';
import { RotateCcw, ChevronRight } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  REQUESTED: 'bg-amber-100 text-amber-700',
  UNDER_REVIEW: 'bg-blue-100 text-blue-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-600',
  PICKUP_PENDING: 'bg-purple-100 text-purple-700',
  RECEIVED: 'bg-blue-100 text-blue-700',
  REFUND_PENDING: 'bg-amber-100 text-amber-700',
  REFUNDED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-gray-100 text-gray-600',
};

const ReturnsPage: React.FC = () => {
  const { user } = useAuth();
  const [returns, setReturns] = useState<ReturnRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    api.get('/customer/returns')
      .then(res => setReturns(res.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-semibold">Returns & Refunds</h1>
        <p className="text-text-muted text-sm mt-1">Track all your return requests here.</p>
      </div>

      <div className="bg-white border border-border rounded-xl p-4 text-sm text-text-muted">
        <p>🔄 To request a return, go to <Link to="/account/orders" className="text-primary hover:underline font-medium">My Orders</Link>, open a delivered order, and click <strong>Request Return</strong>.</p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map(i => <div key={i} className="h-24 bg-surface rounded-xl animate-pulse" />)}
        </div>
      ) : returns.length === 0 ? (
        <div className="bg-white border border-border rounded-xl p-12 text-center">
          <RotateCcw size={36} className="mx-auto mb-4 text-border" />
          <p className="font-medium mb-1">No return requests</p>
          <p className="text-sm text-text-muted">You haven't requested any returns yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {returns.map(ret => (
            <div key={ret.id} className="bg-white border border-border rounded-xl p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">
                    Return for Order #{ret.orderId.slice(-8).toUpperCase()}
                  </p>
                  <p className="text-xs text-text-muted mt-0.5">
                    {ret.items.length} item{ret.items.length !== 1 ? 's' : ''} ·
                    Requested {new Date(ret.requestedAt || ret.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                  <p className="text-xs text-text-muted mt-1">Reason: {ret.reason}</p>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium shrink-0 ${STATUS_COLORS[ret.status] || 'bg-gray-100 text-gray-600'}`}>
                  {ret.status.replace(/_/g, ' ')}
                </span>
              </div>

              {/* Return status explanation */}
              <div className="mt-3 pt-3 border-t border-border text-xs text-text-muted">
                {ret.status === 'REQUESTED' && 'Our team is reviewing your request.'}
                {ret.status === 'APPROVED' && 'Return approved. We\'ll schedule a pickup soon.'}
                {ret.status === 'PICKUP_PENDING' && 'Pickup is being arranged. Please keep the item ready.'}
                {ret.status === 'RECEIVED' && 'Item received. Under inspection.'}
                {ret.status === 'REFUND_PENDING' && 'Inspection complete. Refund is being processed.'}
                {ret.status === 'REFUNDED' && '✓ Refund completed.'}
                {ret.status === 'REJECTED' && 'Return request was rejected. Contact support for details.'}
              </div>

              <div className="mt-3 flex justify-end">
                <Link to={`/account/orders/${ret.orderId}`} className="flex items-center gap-1 text-xs text-primary hover:underline">
                  View Order <ChevronRight size={12} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ReturnsPage;
