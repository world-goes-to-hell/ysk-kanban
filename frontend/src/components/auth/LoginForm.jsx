import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import styles from '../../styles/auth.module.css';

export default function LoginForm() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password.trim()) {
      setError('아이디와 비밀번호를 입력해주세요.');
      return;
    }

    try {
      await login(username.trim(), password.trim(), rememberMe);
    } catch (err) {
      setError('로그인에 실패했습니다. 아이디와 비밀번호를 확인해주세요.');
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="form-group">
        <label className="form-label" htmlFor="login-username">아이디</label>
        <input
          className="form-input"
          type="text"
          id="login-username"
          placeholder="사용자명을 입력하세요"
          autoComplete="username"
          value={username}
          onChange={e => setUsername(e.target.value)}
          required
        />
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor="login-password">비밀번호</label>
        <input
          className="form-input"
          type="password"
          id="login-password"
          placeholder="비밀번호를 입력하세요"
          autoComplete="current-password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />
      </div>
      <label className={styles.rememberMe}>
        <input
          type="checkbox"
          checked={rememberMe}
          onChange={e => setRememberMe(e.target.checked)}
        />
        로그인 유지
      </label>
      <button className="btn btn-primary btn-full" type="submit">로그인</button>
      {error && <p className={styles.authError}>{error}</p>}
    </form>
  );
}
