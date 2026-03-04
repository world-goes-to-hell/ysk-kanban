import { useEffect, useState, useCallback } from 'react';
import projectAPI from '../../api/projects';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../hooks/useToast';
import Modal from '../common/Modal';
import styles from '../../styles/members.module.css';

export default function ProjectMembersModal({ project, onClose, onUpdated }) {
  const { currentUser } = useAuth();
  const showToast = useToast();
  const [members, setMembers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');

  const loadMembers = useCallback(async () => {
    try {
      const data = await projectAPI.getMembers(project.id);
      setMembers(data);
    } catch { setMembers([]); }
  }, [project.id]);

  const loadUsers = useCallback(async () => {
    try {
      const data = await projectAPI.getUsers();
      setAllUsers(data);
    } catch { setAllUsers([]); }
  }, []);

  useEffect(() => {
    loadMembers();
    loadUsers();
  }, [loadMembers, loadUsers]);

  const memberIds = new Set(members.map(m => m.user?.id));
  const availableUsers = allUsers.filter(u => !memberIds.has(u.id));

  const handleAdd = async () => {
    if (!selectedUserId) return;
    try {
      await projectAPI.addMember(project.id, Number(selectedUserId), 'MEMBER');
      showToast('참여자가 추가되었습니다.', 'success');
      setSelectedUserId('');
      await loadMembers();
      onUpdated?.();
    } catch (err) {
      showToast(err.message || '참여자 추가 실패', 'error');
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      await projectAPI.updateMemberRole(project.id, userId, newRole);
      showToast('역할이 변경되었습니다.', 'success');
      await loadMembers();
      onUpdated?.();
    } catch (err) {
      showToast(err.message || '역할 변경 실패', 'error');
    }
  };

  const handleRemove = async (userId) => {
    try {
      await projectAPI.removeMember(project.id, userId);
      showToast('참여자가 제거되었습니다.', 'success');
      await loadMembers();
      onUpdated?.();
    } catch (err) {
      showToast(err.message || '참여자 제거 실패', 'error');
    }
  };

  const isMaster = members.some(m => m.user?.id === currentUser?.id && m.role === 'MASTER');

  return (
    <Modal title={`멤버 관리 — ${project.name || project.projectKey}`} onClose={onClose}>
      <div className={styles.membersModal}>
        {/* 멤버 목록 */}
        <div className={styles.memberList}>
          {members.map(m => (
            <div key={m.id} className={styles.memberItem}>
              <div className={styles.memberInfo}>
                <span className={styles.memberIcon}>&#128100;</span>
                <span className={styles.memberName}>{m.user?.displayName || m.user?.username}</span>
                <span className={styles.memberUsername}>@{m.user?.username}</span>
              </div>
              <div className={styles.memberActions}>
                {isMaster ? (
                  <>
                    <select
                      className={styles.roleSelect}
                      value={m.role}
                      onChange={e => handleRoleChange(m.user.id, e.target.value)}
                    >
                      <option value="MASTER">마스터</option>
                      <option value="MEMBER">멤버</option>
                    </select>
                    {m.user?.id !== currentUser?.id && (
                      <button
                        className={styles.removeBtn}
                        onClick={() => handleRemove(m.user.id)}
                        title="제거"
                      >&#10005;</button>
                    )}
                  </>
                ) : (
                  <span className={`${styles.roleBadge} ${m.role === 'MASTER' ? styles.roleMaster : styles.roleMember}`}>
                    {m.role === 'MASTER' ? '마스터' : '멤버'}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* 참여자 추가 (MASTER만) */}
        {isMaster && (
          <div className={styles.addSection}>
            <h4 className={styles.addTitle}>참여자 추가</h4>
            <div className={styles.addRow}>
              <select
                className={styles.userSelect}
                value={selectedUserId}
                onChange={e => setSelectedUserId(e.target.value)}
              >
                <option value="">사용자 선택...</option>
                {availableUsers.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.displayName} (@{u.username})
                  </option>
                ))}
              </select>
              <button
                className="btn btn-primary btn-sm"
                onClick={handleAdd}
                disabled={!selectedUserId}
              >
                추가
              </button>
            </div>
            {availableUsers.length === 0 && (
              <p className={styles.noUsers}>추가 가능한 사용자가 없습니다.</p>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
