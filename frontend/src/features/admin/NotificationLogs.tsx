import React, { useEffect, useState } from 'react';
import api from '@/services/api';
import AdminLayout from '@/layouts/AdminLayout';
import { format } from 'date-fns';

interface NotificationLog {
  id: string;
  type: string;
  email: string;
  title: string;
  status: 'sent' | 'failed';
  error?: string;
  processedAt: string;
}

export const NotificationLogs = () => {
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const res = await api.get('/admin/notification-logs');
      setLogs(res.data);
    } catch (err) {
      console.error('Failed to fetch notification logs', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="p-10">
        <h1 className="text-3xl font-display mb-8">Notification Logs</h1>
        
        <div className="bg-white rounded shadow-sm border border-border overflow-hidden">
          {loading ? (
            <div className="p-10 flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface text-sm uppercase tracking-wider text-text-muted border-b border-border">
                  <th className="p-4">Date</th>
                  <th className="p-4">Type</th>
                  <th className="p-4">Recipient</th>
                  <th className="p-4">Title</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Error</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-text-muted">
                      No notification logs found
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-surface/50 text-sm">
                      <td className="p-4 whitespace-nowrap">
                        {log.processedAt ? format(new Date(log.processedAt), 'MMM d, yyyy HH:mm:ss') : 'N/A'}
                      </td>
                      <td className="p-4 font-medium">{log.type}</td>
                      <td className="p-4">{log.email}</td>
                      <td className="p-4">{log.title}</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium uppercase ${
                          log.status === 'sent' ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
                        }`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="p-4 text-xs text-danger max-w-[200px] truncate" title={log.error}>
                        {log.error || '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};
