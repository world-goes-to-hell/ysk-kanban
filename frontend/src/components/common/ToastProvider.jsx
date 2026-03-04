import { createContext, useState, useCallback, useRef } from 'react';
import Toast from './Toast';
import styles from '../../styles/toast.module.css';

export const ToastContext = createContext();

let toastId = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const toastsRef = useRef([]);

  const showToast = useCallback((message, type = 'default', duration = 3500) => {
    const id = ++toastId;
    const toast = { id, message, type };
    toastsRef.current = [...toastsRef.current, toast];
    setToasts([...toastsRef.current]);

    setTimeout(() => {
      toastsRef.current = toastsRef.current.map(t =>
        t.id === id ? { ...t, leaving: true } : t
      );
      setToasts([...toastsRef.current]);

      setTimeout(() => {
        toastsRef.current = toastsRef.current.filter(t => t.id !== id);
        setToasts([...toastsRef.current]);
      }, 220);
    }, duration);
  }, []);

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <div className={styles.container} aria-live="polite">
        {toasts.map(t => (
          <Toast key={t.id} message={t.message} type={t.type} leaving={t.leaving} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}
