import { useState, useCallback } from 'react';
import commentReadAPI from '../api/commentRead';

export function useUnreadComments() {
  const [unreadCounts, setUnreadCounts] = useState({});

  const loadUnreadCounts = useCallback(async (todoIds) => {
    if (!todoIds || todoIds.length === 0) {
      setUnreadCounts({});
      return;
    }
    try {
      const data = await commentReadAPI.getUnreadCounts(todoIds);
      setUnreadCounts(data || {});
    } catch {
      setUnreadCounts({});
    }
  }, []);

  const markAsRead = useCallback(async (todoId) => {
    try {
      await commentReadAPI.markAsRead(todoId);
      setUnreadCounts(prev => {
        const next = { ...prev };
        delete next[todoId];
        return next;
      });
    } catch {
      // silent fail
    }
  }, []);

  return { unreadCounts, loadUnreadCounts, markAsRead };
}
