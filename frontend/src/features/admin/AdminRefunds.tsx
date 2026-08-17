import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/services/api';
import AdminLayout from '@/layouts/AdminLayout';

const STATUS_COLOR: Record<string, string> = {
  PROCESSED: 'bg-green-100 text-green-700',
  PROCESSING: 'bg-blue-100 text-blue-700',
  FAILED: 'bg-red-100 text-red-700',
  REQUESTED: 'bg-yellow-100 text-yellow-700',
};

export const AdminRefunds = () => {
  const [refunds, setRefunds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchRefunds = async () => {
    try {
      const res = await api.get('/admin/refunds');
      setRefunds(res.data);
    } catch (error) {
      console.error('Failed to fetch refunds', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRefunds(); }, []);

  const processRefund = async (refund: any) => {
    if (!confirm(`Process refund of ₹${Number(refund.amount).toLocaleString('en-IN')} for order #${refund.orderId?.slice(-8).toUpperCase()}?`)) return;
    try {
      await api.put(`/admin/refunds/${refund.id}`, { status: 'PROCESSING' });
      fetchRefunds();
    } catch { alert('Failed to process refund'); }
  };

  return (
    <AdminLayout>
      <div className="p-8">
        <h1 className="text-2xl font-display mb-6">Refunds</h1>

        {loading ? (
          <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
        ) : (
          <div className="bg-white border border-border rounded overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#F0F0F0]">
                <tr>
                  <th className="p-3 font-semibold">Refund ID</th>
                  <th className="p-3 font-semibold">Order #</th>
                  <th className="p-3 font-semibold">Customer</th>
                  <th className="p-3 font-semibold">Date</th>
                  <th className="p-3 font-semibold">Amount</th>
                  <th className="p-3 font-semibold">Reason</th>
                  <th className="p-3 font-semibold">Status</th>
                  <th className="p-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {refunds.map(refund => (
                  <tr key={refund.id} className="hover:bg-surface">
                    <td className="p-3 font-mono text-xs">{refund.id?.slice(-8)}</td>
                    <td className="p-3">
                      <button
                        onClick={() => navigate(`/admin/orders/${refund.orderId}`)}
                        className="font-mono text-xs text-primary hover:underline"
                      >
                        #{refund.orderId?.slice(-8).toUpperCase()}
                      </button>
                    </td>
                    <td className="p-3">
                      <p className="font-medium">{refund.customerName || '—'}</p>
                      <p className="text-xs text-text-muted">{refund.customerEmail}</p>
                    </td>
                    <td className="p-3 text-xs text-text-muted">
                      {refund.createdAt ? new Date(refund.createdAt).toLocaleDateString() : '—'}
                    </td>
                    <td className="p-3 font-semibold">₹{Number(refund.amount || 0).toLocaleString('en-IN')}</td>
                    <td className="p-3 text-text-muted text-xs max-w-[120px] truncate">{refund.reason || '—'}</td>
                    <td className="p-3">
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${STATUS_COLOR[refund.status] || 'bg-gray-100 text-gray-500'}`}>
                        {refund.status || '—'}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      {refund.status === 'REQUESTED' && (
                        <button onClick={() => processRefund(refund)} className="text-primary text-sm hover:underline">
                          Process
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {refunds.length === 0 && (
                  <tr><td colSpan={8} className="p-10 text-center text-text-muted">No refunds found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};
