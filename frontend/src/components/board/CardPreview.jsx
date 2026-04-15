import { useEffect, useState } from 'react';
import { getPriorityClass, getPriorityLabel, formatStatus, formatDueDate, formatTime } from '../../utils/formatters';
import commentAPI from '../../api/comments';
import attachmentAPI from '../../api/attachments';
import CopyableId from '../common/CopyableId';
import styles from '../../styles/board.module.css';

const STATUS_CLASS_MAP = {
  TODO: styles.statusTodo,
  IN_PROGRESS: styles.statusInProgress,
  DONE: styles.statusDone,
};

export default function CardPreview({ item, anchorRect, onMouseEnter, onMouseLeave }) {
  const [comments, setComments] = useState(null);
  const [attachments, setAttachments] = useState(null);

  useEffect(() => {
    let cancelled = false;

    commentAPI.list(item.id).then(data => {
      if (!cancelled) setComments(data);
    }).catch(() => {
      if (!cancelled) setComments([]);
    });

    attachmentAPI.list(item.id).then(data => {
      if (!cancelled) setAttachments(data);
    }).catch(() => {
      if (!cancelled) setAttachments([]);
    });

    return () => { cancelled = true; };
  }, [item.id]);

  const loading = comments === null || attachments === null;
  const recentComments = comments ? comments.slice(-4) : [];
  const priorityClass = getPriorityClass(item.priority);
  const priorityLabel = getPriorityLabel(item.priority);
  const dueInfo = item.status !== 'DONE' ? formatDueDate(item.dueDate) : null;
  const authorName = item.createdBy?.displayName || item.createdBy?.username || '';

  // 카드 오른쪽에 배치, 화면 밖이면 왼쪽으로 전환
  const gap = 10;
  const popoverWidth = 380;
  const popoverMaxHeight = 520;
  let left = anchorRect.right + gap;
  let top = anchorRect.top;

  if (left + popoverWidth > window.innerWidth - 16) {
    left = anchorRect.left - popoverWidth - gap;
  }
  if (top + popoverMaxHeight > window.innerHeight - 16) {
    top = Math.max(16, window.innerHeight - popoverMaxHeight - 16);
  }

  return (
    <div
      className={styles.cardPreview}
      style={{ left, top }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* 헤더: 제목 + 상태 */}
      <div className={styles.previewHeader}>
        <CopyableId id={item.id} className={styles.previewId} />
        <h4 className={styles.previewTitle}>{item.summary}</h4>
        <span className={`${styles.cardStatus} ${STATUS_CLASS_MAP[item.status] || ''}`}>
          {formatStatus(item.status)}
        </span>
      </div>

      {/* 메타 정보 */}
      <div className={styles.previewMeta}>
        <span className={`${styles.previewPriority} ${priorityClass}`}>{priorityLabel}</span>
        {dueInfo && (
          <span className={`${styles.cardDue} ${styles[`cardDue${dueInfo.status.charAt(0).toUpperCase() + dueInfo.status.slice(1)}`]}`}>
            {dueInfo.text}
          </span>
        )}
        {authorName && (
          <span className={styles.previewAuthor}>&#128100; {authorName}</span>
        )}
        {item.createdAt && (
          <span className={styles.previewDate}>
            등록: {formatTime(item.createdAt)}
            {item.completedAt && (
              <> ~ 완료: {formatTime(item.completedAt)}</>
            )}
          </span>
        )}
      </div>

      {/* 설명 */}
      <div className={styles.previewSection}>
        <span className={styles.previewLabel}>설명</span>
        {item.description
          ? <p className={styles.previewDesc}>{item.description}</p>
          : <p className={styles.previewDescEmpty}>설명 없음</p>
        }
      </div>

      {loading ? (
        <div className={styles.previewLoading}>불러오는 중...</div>
      ) : (
        <>
          {/* 첨부파일 */}
          {attachments.length > 0 && (
            <div className={styles.previewSection}>
              <span className={styles.previewLabel}>첨부파일 ({attachments.length})</span>
              <div className={styles.previewAttachList}>
                {attachments.map(att => (
                  <div key={att.id} className={styles.previewAttachItem}>
                    <span className={styles.previewAttachIcon}>&#128206;</span>
                    <span className={styles.previewAttachName}>{att.originalFilename}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 댓글 */}
          {comments.length > 0 && (
            <div className={styles.previewSection}>
              <span className={styles.previewLabel}>댓글 ({comments.length})</span>
              <div className={styles.previewCommentList}>
                {recentComments.map(c => (
                  <div key={c.id} className={styles.previewComment}>
                    <div className={styles.previewCommentTop}>
                      <span className={styles.previewCommentAuthor}>
                        &#128100; {c.author?.displayName || c.author?.username}
                      </span>
                      <span className={styles.previewCommentTime}>{formatTime(c.createdAt)}</span>
                    </div>
                    <span className={styles.previewCommentContent}>{c.content}</span>
                  </div>
                ))}
                {comments.length > 4 && (
                  <div className={styles.previewMore}>
                    + {comments.length - 4}개 더...
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 첨부/댓글 둘 다 없을 때 */}
          {attachments.length === 0 && comments.length === 0 && (
            <div className={styles.previewSection}>
              <p className={styles.previewDescEmpty}>첨부파일, 댓글 없음</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
