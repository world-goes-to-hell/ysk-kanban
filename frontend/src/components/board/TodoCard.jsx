import { useState, useRef, useCallback } from 'react';
import { getPriorityClass, getPriorityLabel, truncate, formatStatus, formatDueDate } from '../../utils/formatters';
import CardPreview from './CardPreview';
import styles from '../../styles/board.module.css';

const STATUS_CLASS_MAP = {
  TODO: styles.statusTodo,
  IN_PROGRESS: styles.statusInProgress,
  DONE: styles.statusDone,
};

const HOVER_DELAY = 300;

export default function TodoCard({ item, onTransition, onEdit, onDelete, onClick, provided, isDragging, unreadCount, compact, canDelete }) {
  const priorityClass = getPriorityClass(item.priority);
  const priorityLabel = getPriorityLabel(item.priority);
  const [preview, setPreview] = useState(null);
  const hoverTimer = useRef(null);
  const isOverPopover = useRef(false);

  const clearHover = useCallback(() => {
    if (hoverTimer.current) {
      clearTimeout(hoverTimer.current);
      hoverTimer.current = null;
    }
  }, []);

  const handleMouseEnter = useCallback((e) => {
    clearHover();
    const rect = e.currentTarget.getBoundingClientRect();
    hoverTimer.current = setTimeout(() => {
      setPreview({ top: rect.top, left: rect.left, right: rect.right, bottom: rect.bottom });
    }, HOVER_DELAY);
  }, [clearHover]);

  const handleMouseLeave = useCallback(() => {
    clearHover();
    setTimeout(() => {
      if (!isOverPopover.current) setPreview(null);
    }, 50);
  }, [clearHover]);

  const handlePopoverEnter = useCallback(() => {
    isOverPopover.current = true;
  }, []);

  const handlePopoverLeave = useCallback(() => {
    isOverPopover.current = false;
    setPreview(null);
  }, []);

  const handleCompactAction = (e, handler) => {
    e.stopPropagation();
    handler();
  };

  if (compact) {
    return (
      <>
        <article
          className={`${styles.cardCompact} ${isDragging ? styles.cardCompactDragging : ''}`}
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={onClick}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <span className={styles.cardCompactKey}>#{item.id}</span>
          <span className={styles.cardCompactSummary}>{item.summary}</span>
          {item.subtaskTotal > 0 && (
            <span className={styles.subtaskBadge}>{item.subtaskDone}/{item.subtaskTotal}</span>
          )}
          {unreadCount > 0 && (
            <span className={styles.unreadBadge}>&#128172; {unreadCount}</span>
          )}
          <span className={`${styles.cardCompactPriority} ${priorityClass}`}>{priorityLabel}</span>
          <div className={styles.compactActions}>
            <button
              className={`${styles.compactBtn} ${styles.compactBtnMove}`}
              onClick={(e) => handleCompactAction(e, () => onTransition(e))}
              title="이동"
            >&#8644;</button>
            <button
              className={`${styles.compactBtn} ${styles.compactBtnEdit}`}
              onClick={(e) => handleCompactAction(e, onEdit)}
              title="편집"
            >&#9998;</button>
            {canDelete && (
              <button
                className={`${styles.compactBtn} ${styles.compactBtnDelete}`}
                onClick={(e) => handleCompactAction(e, onDelete)}
                title="삭제"
              >&#10005;</button>
            )}
          </div>
        </article>
        {preview && (
          <CardPreview
            item={item}
            anchorRect={preview}
            onMouseEnter={handlePopoverEnter}
            onMouseLeave={handlePopoverLeave}
          />
        )}
      </>
    );
  }

  const descPreview = truncate(item.description);
  const authorName = item.createdBy?.displayName || item.createdBy?.username || '';
  const dueInfo = item.status !== 'DONE' ? formatDueDate(item.dueDate) : null;

  const handleActionClick = (e, handler) => {
    e.stopPropagation();
    handler();
  };

  return (
    <article
      className={`${styles.card} ${isDragging ? styles.cardDragging : ''}`}
      ref={provided.innerRef}
      {...provided.draggableProps}
      {...provided.dragHandleProps}
      onClick={onClick}
    >
      <div className={styles.cardTop}>
        <span className={styles.cardKey}>#{item.id}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {item.subtaskTotal > 0 && (
            <span className={styles.subtaskBadge}>{item.subtaskDone}/{item.subtaskTotal}</span>
          )}
          {unreadCount > 0 && (
            <span className={styles.unreadBadge}>
              &#128172; {unreadCount}
            </span>
          )}
          <span className={`${styles.cardPriority} ${priorityClass}`}>{priorityLabel}</span>
        </div>
      </div>
      <p className={styles.cardSummary}>{item.summary}</p>
      {descPreview && <p className={styles.cardDescription}>{descPreview}</p>}
      <div className={styles.cardMeta}>
        {dueInfo && (
          <span className={`${styles.cardDue} ${styles[`cardDue${dueInfo.status.charAt(0).toUpperCase() + dueInfo.status.slice(1)}`]}`}>
            {dueInfo.text}
          </span>
        )}
        {item.assignees?.length > 0 && (
          <span className={styles.cardAssignees}>
            {item.assignees.map(a => (
              <span key={a.id} className={styles.cardAssigneeChip}>
                {a.displayName || a.username}
              </span>
            ))}
          </span>
        )}
        {authorName && (
          <span className={styles.cardAuthor}>
            <span className={styles.cardAuthorIcon}>&#128100;</span>
            {authorName}
          </span>
        )}
        <span className={`${styles.cardStatus} ${STATUS_CLASS_MAP[item.status] || ''}`}>
          {formatStatus(item.status)}
        </span>
      </div>
      <div className={styles.cardActions}>
        <button
          className={`${styles.cardBtn} ${styles.cardBtnMove}`}
          onClick={(e) => handleActionClick(e, () => onTransition(e))}
          title="상태 변경"
        >
          이동
        </button>
        <span className={styles.spacer} />
        <button
          className={`${styles.cardBtn} ${styles.cardBtnEdit}`}
          onClick={(e) => handleActionClick(e, onEdit)}
          title="편집"
        >
          편집
        </button>
        {canDelete && (
          <button
            className={`${styles.cardBtn} ${styles.cardBtnDelete}`}
            onClick={(e) => handleActionClick(e, onDelete)}
            title="삭제"
          >
            삭제
          </button>
        )}
      </div>
    </article>
  );
}
