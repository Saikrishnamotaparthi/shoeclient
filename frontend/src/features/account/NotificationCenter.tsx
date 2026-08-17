import React, { useEffect, useState } from 'react';
import { notificationService } from '../../services/notificationService';
import type { Notification } from '../../services/notificationService';
import { format } from 'date-fns';
import { FaBell, FaCheck, FaBox, FaCreditCard, FaUndo } from 'react-icons/fa';

export const NotificationCenter: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const data = await notificationService.getNotifications();
      setNotifications(data);
    } catch (err: any) {
      setError('Failed to load notifications');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, read: true } : n)
      );
    } catch (err) {
      console.error('Failed to mark as read', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (err) {
      console.error('Failed to mark all as read', err);
    }
  };

  const getIcon = (type: string) => {
    switch(type) {
      case 'ORDER_CONFIRMATION':
      case 'ORDER_CANCELLED':
        return <FaBox className="text-blue-500" />;
      case 'PAYMENT_SUCCESS':
      case 'PAYMENT_FAILED':
        return <FaCreditCard className="text-green-500" />;
      case 'SHIPMENT_CREATED':
      case 'SHIPMENT_UPDATE':
        return <FaBox className="text-yellow-500" />;
      case 'REFUND_PROCESSED':
      case 'REFUND_FAILED':
      case 'RETURN_REQUESTED':
      case 'RETURN_APPROVED':
      case 'RETURN_REJECTED':
        return <FaUndo className="text-red-500" />;
      default:
        return <FaBell className="text-gray-500" />;
    }
  };

  if (loading) {
    return <div className="p-4 text-center">Loading notifications...</div>;
  }

  if (error) {
    return <div className="p-4 text-center text-red-500">{error}</div>;
  }

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
        <h2 className="text-lg font-medium text-gray-900 flex items-center gap-2">
          <FaBell /> Notifications
          {unreadCount > 0 && (
            <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
              {unreadCount} new
            </span>
          )}
        </h2>
        {unreadCount > 0 && (
          <button 
            onClick={handleMarkAllAsRead}
            className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            <FaCheck /> Mark all as read
          </button>
        )}
      </div>

      <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No notifications yet.
          </div>
        ) : (
          notifications.map(notification => (
            <div 
              key={notification.id} 
              className={`p-4 hover:bg-gray-50 transition-colors ${!notification.read ? 'bg-blue-50/30' : ''}`}
            >
              <div className="flex items-start gap-4">
                <div className="mt-1 bg-white p-2 rounded-full shadow-sm">
                  {getIcon(notification.type)}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <h3 className={`text-sm font-medium ${!notification.read ? 'text-gray-900' : 'text-gray-700'}`}>
                      {notification.title}
                    </h3>
                    <span className="text-xs text-gray-500 whitespace-nowrap ml-2">
                      {format(new Date(notification.createdAt), 'MMM d, h:mm a')}
                    </span>
                  </div>
                  <p className={`text-sm mt-1 ${!notification.read ? 'text-gray-800' : 'text-gray-600'}`}>
                    {notification.message}
                  </p>
                  
                  {!notification.read && (
                    <button 
                      onClick={() => handleMarkAsRead(notification.id)}
                      className="text-xs text-blue-600 hover:text-blue-800 mt-2 font-medium"
                    >
                      Mark as read
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
