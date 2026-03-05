import { useState, useEffect, useCallback } from 'react';
import notificationAPI from '../api/notifications';

export function useNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadNotifications = useCallback(async () => {
    try {
      const data = await notificationAPI.list();
      setNotifications(Array.isArray(data) ? data : []);
    } catch (_) {}
  }, []);

  const loadUnreadCount = useCallback(async () => {
    try {
      const data = await notificationAPI.unreadCount();
      setUnreadCount(data.count || 0);
    } catch (_) {}
  }, []);

  const markAsRead = useCallback(async (id) => {
    try {
      await notificationAPI.markAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (_) {}
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await notificationAPI.markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (_) {}
  }, []);

  const handleSseNotification = useCallback(() => {
    loadNotifications();
    loadUnreadCount();
  }, [loadNotifications, loadUnreadCount]);

  useEffect(() => {
    loadNotifications();
    loadUnreadCount();
  }, [loadNotifications, loadUnreadCount]);

  return { notifications, unreadCount, markAsRead, markAllAsRead, handleSseNotification };
}
