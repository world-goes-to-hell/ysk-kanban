import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../hooks/useToast';
import authAPI from '../../api/auth';
import styles from '../../styles/mypage.module.css';

export default function MyPage() {
  const { currentUser, setCurrentUser } = useAuth();
  const showToast = useToast();

  const [displayName, setDisplayName] = useState(currentUser?.displayName || '');
  const [profileLoading, setProfileLoading] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  const handleUpdateDisplayName = async (e) => {
    e.preventDefault();
    if (!displayName.trim()) {
      showToast('표시이름을 입력해주세요.', 'error');
      return;
    }
    setProfileLoading(true);
    try {
      const updatedUser = await authAPI.updateProfile(displayName.trim());
      setCurrentUser(updatedUser);
      showToast('표시이름이 변경되었습니다.', 'success');
    } catch (err) {
      showToast(err?.error || '표시이름 변경에 실패했습니다.', 'error');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      showToast('비밀번호를 입력해주세요.', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('새 비밀번호가 일치하지 않습니다.', 'error');
      return;
    }
    if (newPassword.length < 4) {
      showToast('새 비밀번호는 4자 이상이어야 합니다.', 'error');
      return;
    }
    setPasswordLoading(true);
    try {
      await authAPI.changePassword(currentPassword, newPassword);
      showToast('비밀번호가 변경되었습니다.', 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      showToast(err?.error || '비밀번호 변경에 실패했습니다.', 'error');
    } finally {
      setPasswordLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  return (
    <div className={styles.container}>
      <Link to="/" className={styles.backLink}>
        &larr; 돌아가기
      </Link>
      <h2 className={styles.title}>마이페이지</h2>

      {/* 계정 정보 */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>계정 정보</h3>
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>아이디</span>
          <span className={styles.infoValue}>{currentUser?.username}</span>
        </div>
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>가입일</span>
          <span className={styles.infoValue}>{formatDate(currentUser?.createdAt)}</span>
        </div>
      </div>

      {/* 표시이름 변경 */}
      <form className={styles.section} onSubmit={handleUpdateDisplayName}>
        <h3 className={styles.sectionTitle}>표시이름 변경</h3>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>표시이름</label>
          <input
            className={styles.formInput}
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="새 표시이름을 입력하세요"
          />
        </div>
        <div className={styles.formActions}>
          <button
            className="btn btn-primary btn-sm"
            type="submit"
            disabled={profileLoading || displayName.trim() === currentUser?.displayName}
          >
            {profileLoading ? '저장 중...' : '저장'}
          </button>
        </div>
      </form>

      {/* 비밀번호 변경 */}
      <form className={styles.section} onSubmit={handleChangePassword}>
        <h3 className={styles.sectionTitle}>비밀번호 변경</h3>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>현재 비밀번호</label>
          <input
            className={styles.formInput}
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="현재 비밀번호"
          />
        </div>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>새 비밀번호</label>
          <input
            className={styles.formInput}
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="새 비밀번호 (4자 이상)"
          />
        </div>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>새 비밀번호 확인</label>
          <input
            className={styles.formInput}
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="새 비밀번호 확인"
          />
        </div>
        <div className={styles.formActions}>
          <button
            className="btn btn-primary btn-sm"
            type="submit"
            disabled={passwordLoading || !currentPassword || !newPassword || !confirmPassword}
          >
            {passwordLoading ? '변경 중...' : '비밀번호 변경'}
          </button>
        </div>
      </form>
    </div>
  );
}
