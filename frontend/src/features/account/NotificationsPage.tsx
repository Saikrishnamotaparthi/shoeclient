import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { notificationService } from '@/services/notificationService';
import { Bell, BellOff, Check } from 'lucide-react';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
}

const NotificationsPage: React.FC = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) return;
    notificationService.getNotifications()
      .then(setNotifications)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [user]);

  const markRead = async (id: string) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications(ns => ns.map(n => n.id === id ? { ...n, read: true } : n));
    } catch {}
  };

  const markAllRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications(ns => ns.map(n => ({ ...n, read: true })));
    } catch {}
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const typeIcon = (type: string) => {
    switch (type) {
      case 'ORDER_CONFIRMED': return '✅';
      case 'ORDER_SHIPPED': return '🚚';
      case 'OUT_FOR_DELIVERY': return '📦';
      case 'ORDER_DELIVERED': return '🎉';
      case 'RETURN_UPDATED': return '↩️';
      case 'REFUND': return '💰';
      default: return '🔔';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-semibold">Notifications</h1>
          <p className="text-text-muted text-sm mt-1">
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="flex items-center gap-2 text-sm text-primary hover:underline font-medium"
          >
            <Check size={14} /> Mark all read
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-20 bg-surface rounded-xl animate-pulse" />)}
        </div>
      ) : notifications.length === 0 ? (
        <div className="bg-white border border-border rounded-xl p-12 text-center">
          <BellOff size={36} className="mx-auto mb-4 text-border" />
          <p className="font-medium mb-1">No notifications</p>
          <p className="text-sm text-text-muted">You'll see order updates and announcements here.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map(n => (
            <div
              key={n.id}
              className={`flex items-start gap-4 px-5 py-4 rounded-xl border transition-colors cursor-pointer ${
                n.read ? 'bg-white border-border' : 'bg-primary/5 border-primary/20'
              }`}
              onClick={() => !n.read && markRead(n.id)}
            >
              <span className="text-2xl shrink-0 mt-0.5">{typeIcon(n.type)}</span>
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${n.read ? 'font-medium' : 'font-semibold'}`}>{n.title}</p>
                <p className="text-sm text-text-muted mt-0.5">{n.message}</p>
                <p className="text-xs text-text-muted mt-1.5">
                  {new Date(n.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              {!n.read && (
                <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" aria-label="Unread" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NotificationsPage;
