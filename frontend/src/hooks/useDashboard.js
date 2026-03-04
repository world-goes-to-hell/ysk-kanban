import { useState, useCallback } from 'react';
import dashboardAPI from '../api/dashboard';
import { useToast } from './useToast';
import { useLoading } from './useLoading';

export function useDashboard() {
  const [data, setData] = useState(null);
  const showToast = useToast();
  const { showLoading, hideLoading } = useLoading();

  const loadDashboard = useCallback(async () => {
    showLoading();
    try {
      const result = await dashboardAPI.get();
      setData(result);
    } catch (err) {
      showToast('대시보드를 불러오는데 실패했습니다.', 'error');
    } finally {
      hideLoading();
    }
  }, [showLoading, hideLoading, showToast]);

  return { data, loadDashboard };
}
