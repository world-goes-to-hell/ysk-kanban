import { createContext, useContext, useState, useCallback, useRef } from 'react';

const LoadingContext = createContext();

export function LoadingProvider({ children }) {
  const [active, setActive] = useState(false);
  const countRef = useRef(0);

  const showLoading = useCallback(() => {
    countRef.current++;
    setActive(true);
  }, []);

  const hideLoading = useCallback(() => {
    countRef.current = Math.max(0, countRef.current - 1);
    if (countRef.current === 0) {
      setActive(false);
    }
  }, []);

  return (
    <LoadingContext.Provider value={{ active, showLoading, hideLoading }}>
      {children}
    </LoadingContext.Provider>
  );
}

export function useLoading() {
  return useContext(LoadingContext);
}
