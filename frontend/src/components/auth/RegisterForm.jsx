import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import styles from '../../styles/auth.module.css';

export default function RegisterForm({ onSuccess }) {
  const { register } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password.trim()) {
      setError('사용자명과 비밀번호를 입력해주세요.');
      return;
    }

    try {
      await register(username.trim(), password.trim(), displayName.trim());
      setUsername('');
      setPassword('');
      setDisplayName('');
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err.message || '회원가입에 실패했습니다.');
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="form-group">
        <label className="form-label" htmlFor="reg-username">사용자명</label>
        <input
          className="form-input"
          type="text"
          id="reg-username"
          placeholder="사용자명을 입력하세요"
          autoComplete="username"
          value={username}
          onChange={e => setUsername(e.target.value)}
          required
        />
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor="reg-password">비밀번호</label>
        <input
          className="form-input"
          type="password"
          id="reg-password"
          placeholder="비밀번호를 입력하세요"
          autoComplete="new-password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor="reg-displayname">표시 이름</label>
        <input
          className="form-input"
          type="text"
          id="reg-displayname"
          placeholder="표시될 이름을 입력하세요"
          autoComplete="name"
          value={displayName}
          onChange={e => setDisplayName(e.target.value)}
        />
      </div>
      <button className="btn btn-primary btn-full" type="submit">회원가입</button>
      {error && <p className={styles.authError}>{error}</p>}
    </form>
  );
}
