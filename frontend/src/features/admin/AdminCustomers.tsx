import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/services/api';
import AdminLayout from '@/layouts/AdminLayout';

export const AdminCustomers = () => {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/admin/customers').then(res => setCustomers(Array.isArray(res.data) ? res.data : res.data.users || [])).catch(console.error).finally(() => setLoading(false));
  }, []);

  const filtered = search
    ? customers.filter(c =>
        c.displayName?.toLowerCase().includes(search.toLowerCase()) ||
        c.email?.toLowerCase().includes(search.toLowerCase()) ||
        c.phone?.includes(search)
      )
    : customers;

  return (
    <AdminLayout>
      <div className="p-8">
        <h1 className="text-2xl font-display mb-6">Customers</h1>

        <div className="flex gap-3 mb-5">
          <input
            className="border border-border rounded px-3 py-2 text-sm flex-1"
            placeholder="Search name, email, phone…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
        ) : (
          <div className="bg-white border border-border rounded overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-[#F0F0F0]">
                <tr>
                  <th className="p-3 font-semibold">Customer</th>
                  <th className="p-3 font-semibold">Phone</th>
                  <th className="p-3 font-semibold">Orders</th>
                  <th className="p-3 font-semibold">Member Since</th>
                  <th className="p-3 font-semibold"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map(c => (
                  <tr key={c.id} className="hover:bg-surface cursor-pointer" onClick={() => navigate(`/admin/customers/${c.id}`)}>
                    <td className="p-3">
                      <p className="font-medium">{c.displayName || c.name || 'N/A'}</p>
                      <p className="text-xs text-text-muted">{c.email}</p>
                    </td>
                    <td className="p-3 text-text-muted">{c.phone || '—'}</td>
                    <td className="p-3">{c.totalOrders || 0}</td>
                    <td className="p-3 text-xs text-text-muted">{c.createdAt ? new Date(c.createdAt).toLocaleDateString() : '—'}</td>
                    <td className="p-3 text-primary text-sm">View →</td>
                  </tr>
                ))}
                {filtered.length === 0 && <tr><td colSpan={5} className="p-10 text-center text-text-muted">No customers found.</td></tr>}
              </tbody>
            </table>
            <div className="px-4 py-2 bg-surface border-t border-border text-xs text-text-muted">{filtered.length} customers</div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};
