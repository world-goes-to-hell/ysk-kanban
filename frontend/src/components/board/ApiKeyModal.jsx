import { useState, useEffect, useCallback } from 'react';
import Modal from '../common/Modal';
import apiKeyAPI from '../../api/apiKeys';
import { useToast } from '../../hooks/useToast';
import styles from '../../styles/apiKey.module.css';

function formatDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now - d;
  if (diff < 60000) return '방금 전';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}분 전`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}시간 전`;
  return d.toLocaleDateString('ko-KR');
}

export default function ApiKeyModal({ projectId, projectName, onClose }) {
  const showToast = useToast();
  const [keys, setKeys] = useState([]);
  const [name, setName] = useState('');
  const [expiresInDays, setExpiresInDays] = useState(0);
  const [createdKey, setCreatedKey] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadKeys = useCallback(async () => {
    try {
      const data = await apiKeyAPI.list(projectId);
      setKeys(data);
    } catch (err) {
      showToast('API Key 목록 조회 실패', 'error');
    }
  }, [projectId, showToast]);

  useEffect(() => {
    loadKeys();
  }, [loadKeys]);

  const handleCreate = async () => {
    if (!name.trim()) {
      showToast('키 이름을 입력하세요', 'error');
      return;
    }
    setLoading(true);
    try {
      const result = await apiKeyAPI.create(projectId, {
        name: name.trim(),
        expiresInDays: expiresInDays || null,
      });
      setCreatedKey(result.rawKey);
      setName('');
      setExpiresInDays(0);
      loadKeys();
      showToast('API Key가 생성되었습니다', 'success');
    } catch (err) {
      showToast('API Key 생성 실패', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (keyId) => {
    try {
      await apiKeyAPI.revoke(projectId, keyId);
      loadKeys();
      showToast('API Key가 폐기되었습니다', 'success');
    } catch (err) {
      showToast('API Key 폐기 실패', 'error');
    }
  };

  const handleCopy = async () => {
    if (!createdKey) return;
    try {
      await navigator.clipboard.writeText(createdKey);
      showToast('클립보드에 복사되었습니다', 'success');
    } catch (_) {
      showToast('복사 실패', 'error');
    }
  };

  return (
    <Modal title={`API Key 관리 - ${projectName || '프로젝트'}`} onClose={onClose}>
      <div className={styles.section}>
        <div className={styles.createForm}>
          <input
            type="text"
            placeholder="키 이름 (예: Claude Code)"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
          />
          <select value={expiresInDays} onChange={e => setExpiresInDays(Number(e.target.value))}>
            <option value={0}>만료 없음</option>
            <option value={30}>30일</option>
            <option value={90}>90일</option>
            <option value={180}>180일</option>
            <option value={365}>365일</option>
          </select>
          <button className="btn btn-primary" onClick={handleCreate} disabled={loading}>
            생성
          </button>
        </div>

        {createdKey && (
          <div className={styles.createdKeyBox}>
            <span className={styles.label}>생성된 키 (이 창을 닫으면 다시 볼 수 없습니다)</span>
            <div className={styles.createdKeyRow}>
              <span className={styles.keyText}>{createdKey}</span>
              <button className={styles.copyBtn} onClick={handleCopy}>복사</button>
            </div>
          </div>
        )}

        {keys.length === 0 ? (
          <div className={styles.emptyMsg}>발급된 API Key가 없습니다</div>
        ) : (
          <table className={styles.keyTable}>
            <thead>
              <tr>
                <th>이름</th>
                <th>Prefix</th>
                <th>생성자</th>
                <th>마지막 사용</th>
                <th>만료</th>
                <th>작업</th>
              </tr>
            </thead>
            <tbody>
              {keys.map(k => (
                <tr key={k.id}>
                  <td>{k.name}</td>
                  <td style={{ fontFamily: 'monospace' }}>{k.prefix}...</td>
                  <td>{k.createdByName}</td>
                  <td>{k.lastUsedAt ? formatDate(k.lastUsedAt) : '사용 안 함'}</td>
                  <td>{k.expiresAt ? new Date(k.expiresAt).toLocaleDateString('ko-KR') : '없음'}</td>
                  <td>
                    <button className={styles.revokeBtn} onClick={() => handleRevoke(k.id)}>
                      폐기
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Modal>
  );
}
