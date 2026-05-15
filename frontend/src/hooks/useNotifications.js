import { useState, useEffect, useCallback } from 'react';
import notificationAPI from '../api/notifications';
import { showNotification, startTitleFlash, stopTitleFlash } from '../utils/browserNotification';

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

  const handleSseNotification = useCallback((data) => {
    loadNotifications();
    loadUnreadCount();
    if (data && (data.id || data.type)) {
      showNotification(data, {
        onClick: (payload) => {
          if (payload?.todoId) {
            window.dispatchEvent(new CustomEvent('open_todo_detail', { detail: { todoId: payload.todoId } }));
          }
        },
      });
    }
  }, [loadNotifications, loadUnreadCount]);

  useEffect(() => {
    loadNotifications();
    loadUnreadCount();
  }, [loadNotifications, loadUnreadCount]);

  useEffect(() => {
    const evaluate = () => {
      if (unreadCount > 0 && !document.hasFocus()) {
        startTitleFlash(unreadCount);
      } else {
        stopTitleFlash();
      }
    };
    evaluate();
    const handleFocus = () => stopTitleFlash();
    const handleBlur = () => evaluate();
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') stopTitleFlash();
      else evaluate();
    };
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('visibilitychange', handleVisibility);
      stopTitleFlash();
    };
  }, [unreadCount]);

  return { notifications, unreadCount, markAsRead, markAllAsRead, handleSseNotification };
}
