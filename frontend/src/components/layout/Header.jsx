import { useAuth } from '../../contexts/AuthContext';
import styles from '../../styles/layout.module.css';

export default function Header() {
  const { currentUser, logout } = useAuth();

  return (
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <div className={styles.headerBrand}>
          <span className={styles.headerLogo} />
          <h1 className={styles.headerTitle}>일감 관리 보드</h1>
        </div>
        <div className={styles.headerRight}>
          <span className={styles.headerUser}>
            {currentUser?.displayName || currentUser?.username || ''}
          </span>
          <button className="btn btn-ghost btn-sm" onClick={logout}>로그아웃</button>
        </div>
      </div>
    </header>
  );
}
