import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import styles from '../../styles/layout.module.css';

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // 사이드바 외부 클릭 시 닫기 (모바일)
  useEffect(() => {
    const handleClick = (e) => {
      if (sidebarOpen) {
        const sidebar = document.querySelector(`.${styles.sidebar}`);
        const toggle = document.querySelector(`.${styles.sidebarToggle}`);
        if (sidebar && !sidebar.contains(e.target) && toggle && !toggle.contains(e.target)) {
          setSidebarOpen(false);
        }
      }
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [sidebarOpen]);

  return (
    <div className={styles.appPage}>
      <Header />
      <div className={styles.appBody}>
        <Sidebar sidebarOpen={sidebarOpen} onCloseSidebar={() => setSidebarOpen(false)} />
        <main className={styles.mainContent}>
          <Outlet />
        </main>
      </div>
      <button
        className={styles.sidebarToggle}
        onClick={() => setSidebarOpen(prev => !prev)}
        aria-label="메뉴 열기"
      >
        &#9776;
      </button>
    </div>
  );
}
