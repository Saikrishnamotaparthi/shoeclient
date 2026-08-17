import React, { useEffect, useState } from 'react';
import api from '@/services/api';
import AdminLayout from '@/layouts/AdminLayout';

interface AuditLog {
  id: string;
  timestamp: string;
  adminUserId: string;
  action: string;
  entityType: string;
  entityId: string;
  changes?: Record<string, any>;
}

export const AdminAuditLogs = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.get('/admin/audit-logs')
      .then(res => {
        // API may return array directly or wrapped in { logs: [] }
        const data = res.data;
        setLogs(Array.isArray(data) ? data : (data.logs || []));
      })
      .catch(err => {
        console.error('Failed to fetch audit logs', err);
        setError('Failed to load audit logs. Please try again.');
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = logs.filter(l =>
    !search ||
    l.action?.toLowerCase().includes(search.toLowerCase()) ||
    l.entityType?.toLowerCase().includes(search.toLowerCase()) ||
    l.entityId?.toLowerCase().includes(search.toLowerCase()) ||
    l.adminUserId?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="p-8 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-display font-semibold">Audit Logs</h1>
            <p className="text-sm text-text-muted mt-1">All admin actions are recorded here.</p>
          </div>
          <input
            type="search"
            placeholder="Search action, entity, admin…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-primary w-64"
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-24">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded p-6 text-sm text-center">
            {error}
          </div>
        ) : (
          <div className="bg-white border border-border rounded overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface border-b border-border">
                <tr>
                  <th className="px-4 py-3 font-semibold text-xs text-text-muted uppercase tracking-wider">Timestamp</th>
                  <th className="px-4 py-3 font-semibold text-xs text-text-muted uppercase tracking-wider">Admin</th>
                  <th className="px-4 py-3 font-semibold text-xs text-text-muted uppercase tracking-wider">Action</th>
                  <th className="px-4 py-3 font-semibold text-xs text-text-muted uppercase tracking-wider">Entity Type</th>
                  <th className="px-4 py-3 font-semibold text-xs text-text-muted uppercase tracking-wider">Entity ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-text-muted">
                      {search ? 'No matching logs found.' : 'No audit logs yet.'}
                    </td>
                  </tr>
                ) : filtered.map(log => (
                  <tr key={log.id} className="hover:bg-surface transition-colors">
                    <td className="px-4 py-3 text-xs font-mono text-text-muted whitespace-nowrap">
                      {log.timestamp ? new Date(log.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-text-muted max-w-[120px] truncate">
                      {log.adminUserId || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-block bg-primary/10 text-primary text-xs font-semibold px-2 py-0.5 rounded">
                        {log.action || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs uppercase tracking-wider text-text-muted">
                      {log.entityType || '—'}
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-text-muted max-w-[180px] truncate">
                      {log.entityId || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length > 0 && (
              <div className="px-4 py-3 border-t border-border text-xs text-text-muted">
                Showing {filtered.length} of {logs.length} log{logs.length !== 1 ? 's' : ''}
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};
