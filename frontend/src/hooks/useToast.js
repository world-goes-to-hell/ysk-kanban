import { useContext } from 'react';
import { ToastContext } from '../components/common/ToastProvider';

export function useToast() {
  return useContext(ToastContext);
}
