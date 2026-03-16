import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import authAPI from '../api/auth';
import { useToast } from '../hooks/useToast';
import { useLoading } from '../hooks/useLoading';

const AuthContext = createContext();

const SESSION_TIMEOUT_MS = 60 * 60 * 1000;   // 1시간
const WARNING_BEFORE_MS  = 5 * 60 * 1000;    // 만료 5분 전 경고
const WARNING_AT_MS      = SESSION_TIMEOUT_MS - WARNING_BEFORE_MS; // 55분
const COUNTDOWN_SEC      = 60;

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionWarning, setSessionWarning] = useState(false);
  const [countdown, setCountdown] = useState(COUNTDOWN_SEC);

  const showToast = useToast();
  const { showLoading, hideLoading } = useLoading();

  const warningTimerRef = useRef(null);
  const countdownTimerRef = useRef(null);

  const clearTimers = useCallback(() => {
    if (warningTimerRef.current) {
      clearTimeout(warningTimerRef.current);
      warningTimerRef.current = null;
    }
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
  }, []);

  const doLogout = useCallback(async () => {
    clearTimers();
    setSessionWarning(false);
    try { await authAPI.logout(); } catch (_) {}
    setCurrentUser(null);
  }, [clearTimers]);

  const startSessionTimer = useCallback(() => {
    clearTimers();
    warningTimerRef.current = setTimeout(() => {
      setSessionWarning(true);
      setCountdown(COUNTDOWN_SEC);

      countdownTimerRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            doLogout();
            showToast('세션이 만료되어 로그아웃되었습니다.', 'error');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }, WARNING_AT_MS);
  }, [clearTimers, doLogout, showToast]);

  const handleExtend = useCallback(async () => {
    try {
      await authAPI.refresh();
      setSessionWarning(false);
      clearTimers();
      startSessionTimer();
      showToast('세션이 연장되었습니다.', 'success');
    } catch (_) {
      doLogout();
      showToast('세션 연장에 실패했습니다.', 'error');
    }
  }, [clearTimers, startSessionTimer, doLogout, showToast]);

  useEffect(() => {
    authAPI.me()
      .then(user => {
        if (user) {
          setCurrentUser(user);
          startSessionTimer();
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    return () => clearTimers();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handleSessionExpired = () => {
      clearTimers();
      setSessionWarning(false);
      setCurrentUser(null);
      showToast('세션이 만료되었습니다. 다시 로그인해주세요.', 'error');
    };

    window.addEventListener('session-expired', handleSessionExpired);
    return () => window.removeEventListener('session-expired', handleSessionExpired);
  }, [clearTimers, showToast]);

  const login = useCallback(async (username, password) => {
    showLoading();
    try {
      const user = await authAPI.login(username, password);
      setCurrentUser(user);
      startSessionTimer();
      return user;
    } finally {
      hideLoading();
    }
  }, [showLoading, hideLoading, startSessionTimer]);

  const register = useCallback(async (username, password, displayName) => {
    showLoading();
    try {
      await authAPI.register(username, password, displayName || username);
      showToast('회원가입이 완료되었습니다. 로그인해주세요.', 'success');
    } finally {
      hideLoading();
    }
  }, [showLoading, hideLoading, showToast]);

  const logout = useCallback(async () => {
    showLoading();
    await doLogout();
    hideLoading();
  }, [showLoading, hideLoading, doLogout]);

  return (
    <AuthContext.Provider value={{ currentUser, setCurrentUser, loading, login, register, logout }}>
      {children}
      {sessionWarning && (
        <div className="session-warning-overlay">
          <div className="session-warning-modal">
            <p className="session-warning-title">세션 만료 안내</p>
            <p className="session-warning-text">
              세션이 곧 만료됩니다. 연장하시겠습니까?
            </p>
            <p className="session-warning-countdown">{countdown}초</p>
            <div className="session-warning-actions">
              <button className="btn btn-primary" onClick={handleExtend}>연장</button>
              <button className="btn" onClick={logout}>로그아웃</button>
            </div>
          </div>
        </div>
      )}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
