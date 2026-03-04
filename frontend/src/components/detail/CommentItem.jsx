import { useState } from 'react';
import { formatTime } from '../../utils/formatters';
import commentAttachmentAPI from '../../api/commentAttachments';
import styles from '../../styles/detail.module.css';

export default function CommentItem({ comment, currentUser, onEdit, onDelete }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);

  const author = comment.author?.displayName || comment.author?.username || '알 수 없음';
  const initial = author.charAt(0).toUpperCase();
  const attachments = comment.attachments || [];
  const isOwner = currentUser?.username === comment.author?.username;

  const handleSave = () => {
    const trimmed = editContent.trim();
    if (!trimmed) return;
    onEdit(comment.id, trimmed);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditContent(comment.content);
    setIsEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    }
    if (e.key === 'Escape') {
      handleCancel();
    }
  };

  return (
    <div className={styles.commentItem}>
      <div className={styles.commentAvatar}>{initial}</div>
      <div className={styles.commentBubble}>
        <div className={styles.commentHeader}>
          <span className={styles.commentAuthor}>{author}</span>
          <span className={styles.commentTime}>{formatTime(comment.createdAt)}</span>
        </div>
        {isEditing ? (
          <>
            <textarea
              className={`form-input form-textarea--sm ${styles.commentEditArea}`}
              value={editContent}
              onChange={e => setEditContent(e.target.value)}
              onKeyDown={handleKeyDown}
              rows="2"
              autoFocus
            />
            <div className={styles.commentEditActions}>
              <button className="btn btn-primary btn-sm" onClick={handleSave}>저장</button>
              <button className="btn btn-sm" onClick={handleCancel}>취소</button>
            </div>
          </>
        ) : (
          <>
            <div className={styles.commentBody}>{comment.content}</div>
            {attachments.length > 0 && (
              <div className={styles.commentAttachGrid}>
                {attachments.map(att => {
                  const url = commentAttachmentAPI.getUrl(comment.id, att.id);
                  return (
                    <div key={att.id} className={styles.commentAttachThumb} onClick={() => window.open(url, '_blank')}>
                      <img src={url} alt={att.originalFilename || '첨부'} className={styles.commentAttachImg} loading="lazy" />
                    </div>
                  );
                })}
              </div>
            )}
            {isOwner && (
              <div className={styles.commentActions}>
                <button
                  className={styles.commentEditBtn}
                  onClick={() => setIsEditing(true)}
                  title="수정"
                >
                  수정
                </button>
                <button
                  className={styles.commentDeleteBtn}
                  onClick={() => onDelete(comment.id)}
                  title="삭제"
                >
                  삭제
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
