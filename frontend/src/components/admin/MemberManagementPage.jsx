import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import adminUsersAPI from '../../api/adminUsers';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../hooks/useToast';
import styles from '../../styles/adminMembers.module.css';

const emptyForm = {
  username: '',
  displayName: '',
  password: '',
};

export default function MemberManagementPage() {
  const { currentUser, setCurrentUser } = useAuth();
  const showToast = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [displayDrafts, setDisplayDrafts] = useState({});
  const [passwordDrafts, setPasswordDrafts] = useState({});
  const [creating, setCreating] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [resettingId, setResettingId] = useState(null);

  const isAdmin = currentUser?.username === 'admin';

  const stats = useMemo(() => {
    const botCount = users.filter(u => u.bot).length;
    return {
      total: users.length,
      normal: users.length - botCount,
      bot: botCount,
    };
  }, [users]);

  useEffect(() => {
    if (!isAdmin) return;
    let ignore = false;
    setLoading(true);
    adminUsersAPI.list()
      .then(list => {
        if (ignore) return;
        setUsers(list);
        setDisplayDrafts(Object.fromEntries(list.map(u => [u.id, u.displayName || ''])));
      })
      .catch(err => showToast(err.message || '회원 목록을 불러오지 못했습니다.', 'error'))
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => { ignore = true; };
  }, [isAdmin, showToast]);

  if (!isAdmin) return <Navigate to="/" replace />;

  const updateForm = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    const payload = {
      username: form.username.trim(),
      displayName: form.displayName.trim(),
      password: form.password,
    };
    if (!payload.username || !payload.displayName || !payload.password) {
      showToast('아이디, 표시이름, 비밀번호를 모두 입력해주세요.', 'error');
      return;
    }
    if (payload.password.length < 4) {
      showToast('비밀번호는 4자 이상이어야 합니다.', 'error');
      return;
    }

    setCreating(true);
    try {
      const created = await adminUsersAPI.create(payload);
      setUsers(prev => [...prev, created]);
      setDisplayDrafts(prev => ({ ...prev, [created.id]: created.displayName || '' }));
      setForm(emptyForm);
      showToast('회원이 생성되었습니다.', 'success');
    } catch (err) {
      showToast(err.message || '회원 생성에 실패했습니다.', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleSaveDisplayName = async (user) => {
    const nextName = (displayDrafts[user.id] || '').trim();
    if (!nextName) {
      showToast('표시이름을 입력해주세요.', 'error');
      return;
    }
    setSavingId(user.id);
    try {
      const updated = await adminUsersAPI.update(user.id, { displayName: nextName });
      setUsers(prev => prev.map(u => (u.id === updated.id ? updated : u)));
      setDisplayDrafts(prev => ({ ...prev, [updated.id]: updated.displayName || '' }));
      if (updated.id === currentUser?.id) {
        setCurrentUser(prev => (prev ? { ...prev, displayName: updated.displayName } : prev));
      }
      showToast('표시이름이 저장되었습니다.', 'success');
    } catch (err) {
      showToast(err.message || '표시이름 저장에 실패했습니다.', 'error');
    } finally {
      setSavingId(null);
    }
  };

  const handleResetPassword = async (user) => {
    const nextPassword = passwordDrafts[user.id] || '';
    if (nextPassword.length < 4) {
      showToast('새 비밀번호는 4자 이상이어야 합니다.', 'error');
      return;
    }
    setResettingId(user.id);
    try {
      await adminUsersAPI.resetPassword(user.id, nextPassword);
      setPasswordDrafts(prev => ({ ...prev, [user.id]: '' }));
      showToast(`${user.displayName}님의 비밀번호가 재설정되었습니다.`, 'success');
    } catch (err) {
      showToast(err.message || '비밀번호 재설정에 실패했습니다.', 'error');
    } finally {
      setResettingId(null);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  return (
    <div className={styles.container}>
      <header className={styles.pageHeader}>
        <div>
          <h2 className={styles.title}>회원관리</h2>
          <p className={styles.subtitle}>admin 계정 전용 사용자 관리</p>
        </div>
        <div className={styles.stats}>
          <span>전체 {stats.total}</span>
          <span>일반 {stats.normal}</span>
          <span>봇 {stats.bot}</span>
        </div>
      </header>

      <form className={styles.createPanel} onSubmit={handleCreate}>
        <div className={styles.panelTitle}>회원 추가</div>
        <div className={styles.createGrid}>
          <label className={styles.field}>
            <span>아이디</span>
            <input
              className={styles.input}
              type="text"
              value={form.username}
              onChange={e => updateForm('username', e.target.value)}
              placeholder="username"
              autoComplete="off"
            />
          </label>
          <label className={styles.field}>
            <span>표시이름</span>
            <input
              className={styles.input}
              type="text"
              value={form.displayName}
              onChange={e => updateForm('displayName', e.target.value)}
              placeholder="홍길동"
              autoComplete="off"
            />
          </label>
          <label className={styles.field}>
            <span>초기 비밀번호</span>
            <input
              className={styles.input}
              type="password"
              value={form.password}
              onChange={e => updateForm('password', e.target.value)}
              placeholder="4자 이상"
              autoComplete="new-password"
            />
          </label>
          <button className={`btn btn-primary ${styles.createButton}`} type="submit" disabled={creating}>
            {creating ? '추가 중...' : '회원 추가'}
          </button>
        </div>
      </form>

      <section className={styles.listPanel}>
        <div className={styles.panelTitle}>회원 목록</div>
        {loading ? (
          <div className={styles.empty}>회원 목록을 불러오는 중입니다.</div>
        ) : users.length === 0 ? (
          <div className={styles.empty}>등록된 회원이 없습니다.</div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>계정</th>
                  <th>표시이름</th>
                  <th>가입일</th>
                  <th>비밀번호 재설정</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => {
                  const displayChanged = (displayDrafts[user.id] || '').trim() !== (user.displayName || '');
                  const isCurrentAdmin = user.username === 'admin';
                  return (
                    <tr key={user.id}>
                      <td>
                        <div className={styles.accountCell}>
                          <span className={styles.username}>{user.username}</span>
                          <span className={styles.badges}>
                            {isCurrentAdmin && <span className={styles.adminBadge}>admin</span>}
                            {user.bot && <span className={styles.botBadge}>bot</span>}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className={styles.inlineForm}>
                          <input
                            className={styles.input}
                            type="text"
                            value={displayDrafts[user.id] || ''}
                            onChange={e => setDisplayDrafts(prev => ({ ...prev, [user.id]: e.target.value }))}
                          />
                          <button
                            className="btn btn-ghost btn-sm"
                            type="button"
                            disabled={!displayChanged || savingId === user.id}
                            onClick={() => handleSaveDisplayName(user)}
                          >
                            {savingId === user.id ? '저장 중...' : '저장'}
                          </button>
                        </div>
                      </td>
                      <td>{formatDate(user.createdAt)}</td>
                      <td>
                        <div className={styles.inlineForm}>
                          <input
                            className={styles.input}
                            type="password"
                            value={passwordDrafts[user.id] || ''}
                            onChange={e => setPasswordDrafts(prev => ({ ...prev, [user.id]: e.target.value }))}
                            placeholder="새 비밀번호"
                            autoComplete="new-password"
                          />
                          <button
                            className="btn btn-ghost btn-sm"
                            type="button"
                            disabled={(passwordDrafts[user.id] || '').length < 4 || resettingId === user.id}
                            onClick={() => handleResetPassword(user)}
                          >
                            {resettingId === user.id ? '변경 중...' : '변경'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
