import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';
import styles from '../../styles/auth.module.css';

export default function AuthPage() {
  const { currentUser, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('login');

  if (loading) return null;
  if (currentUser) return <Navigate to="/" replace />;

  return (
    <div className={styles.authPage}>
      <div className={styles.authCard}>
        <div className={styles.authLogo}>
          <span className={styles.authLogoIcon} />
          <h1 className={styles.authLogoTitle}>일감 관리 보드</h1>
        </div>

        <div className={styles.authTabs}>
          <button
            className={`${styles.authTab} ${activeTab === 'login' ? styles.authTabActive : ''}`}
            onClick={() => setActiveTab('login')}
          >
            로그인
          </button>
          <button
            className={`${styles.authTab} ${activeTab === 'register' ? styles.authTabActive : ''}`}
            onClick={() => setActiveTab('register')}
          >
            회원가입
          </button>
        </div>

        {activeTab === 'login' ? (
          <LoginForm />
        ) : (
          <RegisterForm onSuccess={() => setActiveTab('login')} />
        )}
      </div>
    </div>
  );
}
