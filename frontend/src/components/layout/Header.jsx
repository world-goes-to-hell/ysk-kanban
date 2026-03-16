import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import NotificationBell from './NotificationBell';
import styles from '../../styles/layout.module.css';

export default function Header({ notifications, unreadCount, onMarkAsRead, onMarkAllAsRead }) {
  const { currentUser, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  return (
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <div className={styles.headerBrand}>
          <span className={styles.headerLogo} />
          <h1 className={styles.headerTitle}>일감 관리 보드</h1>
        </div>
        <div className={styles.headerRight}>
          <NotificationBell
            notifications={notifications || []}
            unreadCount={unreadCount || 0}
            onMarkAsRead={onMarkAsRead || (() => {})}
            onMarkAllAsRead={onMarkAllAsRead || (() => {})}
          />
          <button
            className={styles.themeToggle}
            onClick={toggleTheme}
            title={theme === 'light' ? '다크 모드' : '라이트 모드'}
          >
            {theme === 'light' ? '\u{1F319}' : '\u{2600}\u{FE0F}'}
          </button>
          <span
            className={styles.headerUser}
            style={{ cursor: 'pointer' }}
            onClick={() => navigate('/mypage')}
            title="마이페이지"
          >
            {currentUser?.displayName || currentUser?.username || ''}
          </span>
          <button className="btn btn-ghost btn-sm" onClick={logout}>로그아웃</button>
        </div>
      </div>
    </header>
  );
}
