import { useState, useEffect, useCallback } from 'react';
import Modal from '../common/Modal';
import projectAPI from '../../api/projects';
import apiKeyAPI from '../../api/apiKeys';
import { webhookAPI } from '../../api/webhooks';
import { apiFetch } from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../hooks/useToast';
import settingsStyles from '../../styles/projectSettings.module.css';
import membersStyles from '../../styles/members.module.css';
import apiKeyStyles from '../../styles/apiKey.module.css';
import webhookStyles from '../../styles/webhook.module.css';

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

function ProjectTab({ project, onUpdated }) {
  const { currentUser } = useAuth();
  const showToast = useToast();
  const [members, setMembers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [excludedFromReport, setExcludedFromReport] = useState(false);

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

  const loadReportSetting = useCallback(async () => {
    try {
      const settings = await apiFetch('/api/reports/report-settings');
      const setting = settings.find(s => s.projectId === project.id);
      setExcludedFromReport(setting ? setting.excluded : false);
    } catch { /* ignore */ }
  }, [project.id]);

  useEffect(() => {
    loadMembers();
    loadUsers();
    loadReportSetting();
  }, [loadMembers, loadUsers, loadReportSetting]);

  const memberIds = new Set(members.map(m => m.user?.id));
  const availableUsers = allUsers.filter(u => !memberIds.has(u.id));
  const isMaster = members.some(m => m.user?.id === currentUser?.id && m.role === 'MASTER');

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

  const handleToggleReport = async () => {
    const newValue = !excludedFromReport;
    try {
      await apiFetch(`/api/reports/report-settings/${project.id}`, {
        method: 'PUT',
        body: JSON.stringify({ excluded: newValue }),
      });
      setExcludedFromReport(newValue);
      showToast(newValue ? '내 업무보고에서 제외됩니다.' : '내 업무보고에 포함됩니다.', 'success');
    } catch (err) {
      showToast('설정 변경 실패', 'error');
    }
  };

  return (
    <>
      {/* 참여자 관리 */}
      <div className={settingsStyles.settingSection}>
        <h4 className={settingsStyles.settingTitle}>참여자 관리</h4>
        <div className={membersStyles.memberList}>
          {members.map(m => (
            <div key={m.id} className={membersStyles.memberItem}>
              <div className={membersStyles.memberInfo}>
                <span className={membersStyles.memberIcon}>&#128100;</span>
                <span className={membersStyles.memberName}>{m.user?.displayName || m.user?.username}</span>
                <span className={membersStyles.memberUsername}>@{m.user?.username}</span>
              </div>
              <div className={membersStyles.memberActions}>
                {isMaster ? (
                  <>
                    <select
                      className={membersStyles.roleSelect}
                      value={m.role}
                      onChange={e => handleRoleChange(m.user.id, e.target.value)}
                    >
                      <option value="MASTER">마스터</option>
                      <option value="MEMBER">멤버</option>
                    </select>
                    {m.user?.id !== currentUser?.id && (
                      <button
                        className={membersStyles.removeBtn}
                        onClick={() => handleRemove(m.user.id)}
                        title="제거"
                      >&#10005;</button>
                    )}
                  </>
                ) : (
                  <span className={`${membersStyles.roleBadge} ${m.role === 'MASTER' ? membersStyles.roleMaster : membersStyles.roleMember}`}>
                    {m.role === 'MASTER' ? '마스터' : '멤버'}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {isMaster && (
          <div className={membersStyles.addSection}>
            <div className={membersStyles.addRow}>
              <select
                className={membersStyles.userSelect}
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
              <p className={membersStyles.noUsers}>추가 가능한 사용자가 없습니다.</p>
            )}
          </div>
        )}
      </div>

      {/* 업무보고 설정 */}
      <div className={settingsStyles.settingSection}>
        <h4 className={settingsStyles.settingTitle}>업무보고</h4>
        <div className={settingsStyles.toggleRow}>
          <div className={settingsStyles.toggleInfo}>
            <span className={settingsStyles.toggleLabel}>내 업무보고에서 제외</span>
            <span className={settingsStyles.toggleDesc}>
              활성화하면 내 업무보고에서 이 프로젝트가 제외됩니다 (다른 사용자에게 영향 없음)
            </span>
          </div>
          <label className={settingsStyles.toggleSwitch}>
            <input
              type="checkbox"
              checked={excludedFromReport}
              onChange={handleToggleReport}
            />
            <span className={settingsStyles.toggleTrack} />
          </label>
        </div>
      </div>
    </>
  );
}

function ApiTab({ projectId }) {
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
    } catch {
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
    } catch {
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
    } catch {
      showToast('API Key 폐기 실패', 'error');
    }
  };

  const handleCopy = async () => {
    if (!createdKey) return;
    try {
      await navigator.clipboard.writeText(createdKey);
      showToast('클립보드에 복사되었습니다', 'success');
    } catch {
      showToast('복사 실패', 'error');
    }
  };

  return (
    <div className={apiKeyStyles.section}>
      <div className={apiKeyStyles.createForm}>
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
        <div className={apiKeyStyles.createdKeyBox}>
          <span className={apiKeyStyles.label}>생성된 키 (이 창을 닫으면 다시 볼 수 없습니다)</span>
          <div className={apiKeyStyles.createdKeyRow}>
            <span className={apiKeyStyles.keyText}>{createdKey}</span>
            <button className={apiKeyStyles.copyBtn} onClick={handleCopy}>복사</button>
          </div>
        </div>
      )}

      {keys.length === 0 ? (
        <div className={apiKeyStyles.emptyMsg}>발급된 API Key가 없습니다</div>
      ) : (
        <table className={apiKeyStyles.keyTable}>
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
                  <button className={apiKeyStyles.revokeBtn} onClick={() => handleRevoke(k.id)}>
                    폐기
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

const WEBHOOK_EVENTS = [
  { value: 'TODO_CREATED', label: '일감 생성' },
  { value: 'TODO_UPDATED', label: '일감 수정' },
  { value: 'TODO_DELETED', label: '일감 삭제' },
  { value: 'TODO_STATUS_CHANGED', label: '상태 변경' },
  { value: 'COMMENT_ADDED', label: '댓글 추가' },
  { value: 'COMMENT_DELETED', label: '댓글 삭제' },
];

function WebhookTab({ projectId }) {
  const showToast = useToast();
  const [webhooks, setWebhooks] = useState([]);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [secret, setSecret] = useState('');
  const [selectedEvents, setSelectedEvents] = useState(new Set(WEBHOOK_EVENTS.map(e => e.value)));

  const loadWebhooks = useCallback(async () => {
    try {
      const data = await webhookAPI.list(projectId);
      setWebhooks(data);
    } catch {
      showToast('웹훅 목록 조회 실패', 'error');
    }
  }, [projectId, showToast]);

  useEffect(() => { loadWebhooks(); }, [loadWebhooks]);

  const toggleEvent = (event) => {
    setSelectedEvents(prev => {
      const next = new Set(prev);
      if (next.has(event)) next.delete(event);
      else next.add(event);
      return next;
    });
  };

  const handleCreate = async () => {
    if (!name.trim() || !url.trim()) {
      showToast('이름과 URL을 입력하세요', 'error');
      return;
    }
    if (selectedEvents.size === 0) {
      showToast('최소 1개의 이벤트를 선택하세요', 'error');
      return;
    }
    try {
      await webhookAPI.create(projectId, {
        name: name.trim(),
        url: url.trim(),
        events: Array.from(selectedEvents).join(','),
        secret: secret.trim() || null,
      });
      showToast('웹훅이 생성되었습니다', 'success');
      setName('');
      setUrl('');
      setSecret('');
      loadWebhooks();
    } catch {
      showToast('웹훅 생성 실패', 'error');
    }
  };

  const handleToggleActive = async (webhook) => {
    try {
      await webhookAPI.update(projectId, webhook.id, { active: !webhook.active });
      showToast(webhook.active ? '웹훅 비활성화됨' : '웹훅 활성화됨', 'success');
      loadWebhooks();
    } catch {
      showToast('상태 변경 실패', 'error');
    }
  };

  const handleDelete = async (webhookId) => {
    try {
      await webhookAPI.remove(projectId, webhookId);
      showToast('웹훅이 삭제되었습니다', 'success');
      loadWebhooks();
    } catch {
      showToast('웹훅 삭제 실패', 'error');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={webhookStyles.section}>
      <div className={webhookStyles.createForm}>
        <div className={webhookStyles.formRow}>
          <input placeholder="웹훅 이름" value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div className={webhookStyles.formRow}>
          <input placeholder="URL (https://...)" value={url} onChange={e => setUrl(e.target.value)} />
        </div>
        <div className={webhookStyles.formRow}>
          <input placeholder="Secret (선택사항)" value={secret} onChange={e => setSecret(e.target.value)} />
        </div>
        <div className={webhookStyles.eventsGrid}>
          {WEBHOOK_EVENTS.map(evt => (
            <label key={evt.value} className={webhookStyles.eventCheckbox}>
              <input
                type="checkbox"
                checked={selectedEvents.has(evt.value)}
                onChange={() => toggleEvent(evt.value)}
              />
              {evt.label}
            </label>
          ))}
        </div>
        <button className="btn btn-primary btn-sm" onClick={handleCreate}>웹훅 추가</button>
      </div>

      {webhooks.length === 0 ? (
        <div className={webhookStyles.emptyMsg}>등록된 웹훅이 없습니다</div>
      ) : (
        <div className={webhookStyles.webhookList}>
          {webhooks.map(wh => (
            <div key={wh.id} className={webhookStyles.webhookItem}>
              <div className={webhookStyles.webhookHeader}>
                <span className={webhookStyles.webhookName}>{wh.name}</span>
                <div className={webhookStyles.webhookActions}>
                  <span className={`${webhookStyles.statusBadge} ${wh.active ? webhookStyles.statusActive : webhookStyles.statusInactive}`}>
                    {wh.active ? '활성' : '비활성'}
                  </span>
                  <button className={webhookStyles.actionBtn} onClick={() => handleToggleActive(wh)}>
                    {wh.active ? '⏸' : '▶'}
                  </button>
                  <button className={`${webhookStyles.actionBtn} ${webhookStyles.deleteBtn}`} onClick={() => handleDelete(wh.id)}>
                    ✕
                  </button>
                </div>
              </div>
              <div className={webhookStyles.webhookUrl}>{wh.url}</div>
              <div className={webhookStyles.eventTags}>
                {(wh.events || '').split(',').filter(Boolean).map(evt => (
                  <span key={evt} className={webhookStyles.eventTag}>
                    {WEBHOOK_EVENTS.find(e => e.value === evt.trim())?.label || evt}
                  </span>
                ))}
              </div>
              <div className={webhookStyles.webhookMeta}>
                <span>마지막 실행: {formatDate(wh.lastTriggeredAt)}</span>
                {wh.lastResponseStatus && <span>응답: {wh.lastResponseStatus}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ProjectSettingsModal({ project, onClose, onUpdated }) {
  const [activeTab, setActiveTab] = useState('project');

  return (
    <Modal title={`설정 — ${project?.name || '프로젝트'}`} wide onClose={onClose}>
      <div className={settingsStyles.tabNav}>
        <button
          className={`${settingsStyles.tabBtn} ${activeTab === 'project' ? settingsStyles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('project')}
        >
          프로젝트 설정
        </button>
        <button
          className={`${settingsStyles.tabBtn} ${activeTab === 'api' ? settingsStyles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('api')}
        >
          API 설정
        </button>
        <button
          className={`${settingsStyles.tabBtn} ${activeTab === 'webhook' ? settingsStyles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('webhook')}
        >
          웹훅
        </button>
      </div>

      {activeTab === 'project' && (
        <ProjectTab project={project} onUpdated={onUpdated} />
      )}
      {activeTab === 'api' && (
        <ApiTab projectId={project?.id} />
      )}
      {activeTab === 'webhook' && (
        <WebhookTab projectId={project?.id} />
      )}
    </Modal>
  );
}
