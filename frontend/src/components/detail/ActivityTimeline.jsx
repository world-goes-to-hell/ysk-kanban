import { useState, useEffect } from 'react';
import { fetchActivityLogs } from '../../api/activityLogs';
import Modal from '../common/Modal';
import ConfirmDialog from '../common/ConfirmDialog';
import styles from '../../styles/activity.module.css';

const TYPE_CONFIG = {
  CREATED:            { icon: '➕', label: '생성', color: 'var(--success)' },
  UPDATED:            { icon: '✏️', label: '수정', color: 'var(--brand)' },
  DELETED:            { icon: '🗑️', label: '삭제', color: 'var(--danger)' },
  STATUS_CHANGED:     { icon: '🔄', label: '상태 변경', color: 'var(--wip-color)' },
  ASSIGNEE_ADDED:     { icon: '👤', label: '담당자 추가', color: 'var(--brand)' },
  ASSIGNEE_REMOVED:   { icon: '👤', label: '담당자 제거', color: 'var(--text-muted)' },
  COMMENT_ADDED:      { icon: '💬', label: '댓글 추가', color: 'var(--todo-color)' },
  COMMENT_DELETED:    { icon: '💬', label: '댓글 삭제', color: 'var(--text-muted)' },
  ATTACHMENT_ADDED:   { icon: '📎', label: '첨부 추가', color: 'var(--brand)' },
  ATTACHMENT_DELETED: { icon: '📎', label: '첨부 삭제', color: 'var(--text-muted)' },
};

const PAGE_SIZE = 10;

function formatTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now - d;
  if (diff < 60000) return '방금 전';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}분 전`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}시간 전`;
  return d.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function LogItem({ log }) {
  const config = TYPE_CONFIG[log.activityType] || { icon: '•', label: log.activityType, color: 'var(--text-muted)' };
  return (
    <div className={styles.timelineItem}>
      <div className={styles.timelineDot} style={{ background: config.color }} />
      <div className={styles.timelineContent}>
        <div className={styles.timelineMain}>
          <span className={styles.timelineIcon}>{config.icon}</span>
          <span className={styles.timelineActor}>{log.actorName}</span>
          <span className={styles.timelineAction}>{log.detail || config.label}</span>
          {log.oldValue && log.newValue && (
            <span className={styles.timelineChange}>
              <span className={styles.oldValue}>{log.oldValue}</span>
              <span className={styles.arrow}>→</span>
              <span className={styles.newValue}>{log.newValue}</span>
            </span>
          )}
        </div>
        <span className={styles.timelineTime}>{formatTime(log.createdAt)}</span>
      </div>
    </div>
  );
}

export default function ActivityTimeline({ todoId }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalPage, setModalPage] = useState(1);

  useEffect(() => {
    if (!todoId) return;
    setLoading(true);
    fetchActivityLogs(todoId)
      .then(setLogs)
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  }, [todoId]);

  if (loading) return <div className={styles.loading}>활동 이력 로딩...</div>;
  if (logs.length === 0) return null;

  const handleExpand = () => {
    if (!expanded && logs.length >= PAGE_SIZE) {
      setShowConfirm(true);
    } else {
      setExpanded(prev => !prev);
    }
  };

  const totalPages = Math.ceil(logs.length / PAGE_SIZE);
  const modalLogs = logs.slice((modalPage - 1) * PAGE_SIZE, modalPage * PAGE_SIZE);

  return (
    <div className={styles.timeline}>
      <div className={styles.timelineHeader} onClick={handleExpand}>
        <h4 className={styles.timelineTitle}>활동 이력</h4>
        <span className={styles.timelineCount}>{logs.length}건 {expanded ? '▲' : '▼'}</span>
      </div>
      {expanded && logs.length <= PAGE_SIZE && (
        <div className={styles.timelineList}>
          {logs.map(log => <LogItem key={log.id} log={log} />)}
        </div>
      )}

      {showConfirm && (
        <ConfirmDialog
          message="활동이력이 10건 이상인 관계로 새창으로 표출됩니다. 확인하시겠습니까?"
          onConfirm={() => { setShowConfirm(false); setShowModal(true); setModalPage(1); }}
          onCancel={() => setShowConfirm(false)}
        />
      )}

      {showModal && (
        <Modal
          title={`활동 이력 (총 ${logs.length}건)`}
          wide
          onClose={() => { setShowModal(false); setModalPage(1); }}
        >
          <div className={styles.timelineList}>
            {modalLogs.map(log => <LogItem key={log.id} log={log} />)}
          </div>
          {totalPages > 1 && (
            <div className={styles.pagination}>
              <button
                className={styles.pageBtn}
                disabled={modalPage <= 1}
                onClick={() => setModalPage(prev => prev - 1)}
              >
                이전
              </button>
              <span className={styles.pageInfo}>{modalPage} / {totalPages}</span>
              <button
                className={styles.pageBtn}
                disabled={modalPage >= totalPages}
                onClick={() => setModalPage(prev => prev + 1)}
              >
                다음
              </button>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
