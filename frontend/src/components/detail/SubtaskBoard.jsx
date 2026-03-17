import { useState, useCallback } from 'react';
import todoAPI from '../../api/todos';
import { getPriorityClass, getPriorityLabel, formatStatus } from '../../utils/formatters';
import styles from '../../styles/detail.module.css';

const COLUMNS = [
  { key: 'TODO', label: '할 일' },
  { key: 'IN_PROGRESS', label: '진행중' },
  { key: 'DONE', label: '완료' },
];

export default function SubtaskBoard({ parentId, subtasks, onRefresh }) {
  const [adding, setAdding] = useState(false);
  const [newSummary, setNewSummary] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const grouped = COLUMNS.reduce((acc, col) => {
    acc[col.key] = subtasks.filter(t => t.status === col.key);
    return acc;
  }, {});

  const doneCount = grouped.DONE.length;
  const totalCount = subtasks.length;

  const handleAdd = useCallback(async () => {
    if (!newSummary.trim()) return;
    setSubmitting(true);
    try {
      await todoAPI.createSubtask(parentId, { summary: newSummary.trim() });
      setNewSummary('');
      setAdding(false);
      onRefresh();
    } finally {
      setSubmitting(false);
    }
  }, [parentId, newSummary, onRefresh]);

  const handleStatusChange = useCallback(async (subtaskId, newStatus) => {
    await todoAPI.changeStatus(subtaskId, newStatus);
    onRefresh();
  }, [onRefresh]);

  const handleDragStart = useCallback((e, subtaskId) => {
    e.dataTransfer.setData('text/plain', String(subtaskId));
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDrop = useCallback((e, targetStatus) => {
    e.preventDefault();
    const subtaskId = e.dataTransfer.getData('text/plain');
    if (subtaskId) {
      handleStatusChange(Number(subtaskId), targetStatus);
    }
  }, [handleStatusChange]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  return (
    <div className={styles.subtaskBoard}>
      <div className={styles.subtaskHeader}>
        <span className={styles.subtaskTitle}>
          하위 일감 ({doneCount}/{totalCount})
        </span>
        <button
          className={styles.subtaskAddBtn}
          onClick={() => setAdding(true)}
        >
          + 추가
        </button>
      </div>

      {adding && (
        <div className={styles.subtaskAddForm}>
          <input
            className={styles.subtaskAddInput}
            type="text"
            placeholder="하위 일감 제목..."
            value={newSummary}
            onChange={(e) => setNewSummary(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAdd();
              if (e.key === 'Escape') { setAdding(false); setNewSummary(''); }
            }}
            autoFocus
            disabled={submitting}
          />
          <button className={styles.subtaskAddConfirm} onClick={handleAdd} disabled={submitting}>
            {submitting ? '...' : '추가'}
          </button>
          <button className={styles.subtaskAddCancel} onClick={() => { setAdding(false); setNewSummary(''); }}>
            취소
          </button>
        </div>
      )}

      <div className={styles.subtaskColumns}>
        {COLUMNS.map(col => (
          <div
            key={col.key}
            className={styles.subtaskColumn}
            onDrop={(e) => handleDrop(e, col.key)}
            onDragOver={handleDragOver}
          >
            <div className={styles.subtaskColumnHeader}>
              <span>{col.label}</span>
              <span className={styles.subtaskColumnCount}>{grouped[col.key].length}</span>
            </div>
            <div className={styles.subtaskColumnBody}>
              {grouped[col.key].map(task => (
                <div
                  key={task.id}
                  className={styles.subtaskCard}
                  draggable
                  onDragStart={(e) => handleDragStart(e, task.id)}
                >
                  <div className={styles.subtaskCardTop}>
                    <span className={styles.subtaskCardKey}>#{task.id}</span>
                    <span className={`${styles.subtaskCardPriority} ${getPriorityClass(task.priority)}`}>
                      {getPriorityLabel(task.priority)}
                    </span>
                  </div>
                  <p className={styles.subtaskCardSummary}>{task.summary}</p>
                  {task.assignees?.length > 0 && (
                    <div className={styles.subtaskCardAssignees}>
                      {task.assignees.map(a => (
                        <span key={a.id} className={styles.subtaskCardAssignee}>
                          {a.displayName || a.username}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className={styles.subtaskCardActions}>
                    {col.key !== 'TODO' && (
                      <button
                        className={styles.subtaskMoveBtn}
                        onClick={() => handleStatusChange(task.id, col.key === 'DONE' ? 'IN_PROGRESS' : 'TODO')}
                      >
                        ←
                      </button>
                    )}
                    <span className={styles.subtaskCardStatus}>{formatStatus(task.status)}</span>
                    {col.key !== 'DONE' && (
                      <button
                        className={styles.subtaskMoveBtn}
                        onClick={() => handleStatusChange(task.id, col.key === 'TODO' ? 'IN_PROGRESS' : 'DONE')}
                      >
                        →
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
