import React, { useEffect, useState } from 'react';
import api from '@/services/api';
import AdminLayout from '@/layouts/AdminLayout';

export const AdminReturns = () => {
  const [returns, setReturns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReturns();
  }, []);

  const fetchReturns = async () => {
    try {
      const res = await api.get('/admin/returns');
      setReturns(res.data);
    } catch (error) {
      console.error('Failed to fetch returns', error);
    } finally {
      setLoading(false);
    }
  };

  const updateReturnStatus = async (id: string, status: string, condition?: string) => {
    try {
      await api.put(`/admin/returns/${id}/status`, { status, condition });
      fetchReturns();
    } catch (error) {
      console.error('Failed to update return status', error);
    }
  };

  return (
    <AdminLayout>
      <div className="p-10">
        <h1 className="text-3xl font-display mb-8">Returns</h1>
        
        {loading ? (
          <div className="flex justify-center p-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="bg-white border border-border rounded overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-[#F0F0F0]">
                <tr>
                  <th className="p-4 font-semibold text-sm">Return ID</th>
                  <th className="p-4 font-semibold text-sm">Order ID</th>
                  <th className="p-4 font-semibold text-sm">Date</th>
                  <th className="p-4 font-semibold text-sm">Reason</th>
                  <th className="p-4 font-semibold text-sm">Status</th>
                  <th className="p-4 font-semibold text-sm text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {returns.map(ret => (
                  <tr key={ret.id} className="hover:bg-surface transition-colors">
                    <td className="p-4 font-mono text-xs">{ret.id}</td>
                    <td className="p-4 font-mono text-xs">{ret.orderId}</td>
                    <td className="p-4 text-sm">{new Date(ret.createdAt).toLocaleDateString()}</td>
                    <td className="p-4 text-sm truncate max-w-[150px]">{ret.reason}</td>
                    <td className="p-4">
                      <select 
                        value={ret.status}
                        onChange={(e) => updateReturnStatus(ret.id, e.target.value, e.target.value === 'RECEIVED' ? 'RESELLABLE' : undefined)}
                        className="text-xs p-1 border border-border rounded"
                      >
                        <option value="REQUESTED">Requested</option>
                        <option value="APPROVED">Approved</option>
                        <option value="REJECTED">Rejected</option>
                        <option value="RECEIVED">Received</option>
                      </select>
                    </td>
                    <td className="p-4 text-sm text-right">
                      <button className="text-primary hover:underline">View</button>
                    </td>
                  </tr>
                ))}
                {returns.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-text-muted">No returns found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};
