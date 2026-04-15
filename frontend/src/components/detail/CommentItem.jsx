import { useState } from 'react';
import { formatTime } from '../../utils/formatters';
import commentAttachmentAPI from '../../api/commentAttachments';
import { isImageType, getFileIcon } from '../../utils/fileUtils';
import styles from '../../styles/detail.module.css';

export default function CommentItem({ comment, currentUser, onEdit, onDelete, isMaster }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);

  const author = comment.author?.displayName || comment.author?.username || '알 수 없음';
  const initial = author.charAt(0).toUpperCase();
  const isBot = !!comment.author?.bot;
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

  const renderContent = (text) => {
    if (!text) return null;
    const lines = text.split('\n');
    return lines.map((line, lineIdx) => {
      const parts = line.split(/(<<@\w+>>)/g);
      const rendered = parts.map((part, i) => {
        const match = part.match(/^<<@(\w+)>>$/);
        if (match) {
          return <span key={i} className={styles.mentionBadge}>@{match[1]}</span>;
        }
        return part;
      });
      return (
        <span key={lineIdx}>
          {rendered}
          {lineIdx < lines.length - 1 && <br />}
        </span>
      );
    });
  };

  return (
    <div className={styles.commentItem}>
      <div
        className={styles.commentAvatar}
        style={isBot ? { background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0' } : undefined}
      >
        {isBot ? '🤖' : initial}
      </div>
      <div
        className={styles.commentBubble}
        style={isBot ? {
          background: '#f0fdf4',
          borderLeft: '3px solid #10b981',
        } : undefined}
      >
        <div className={styles.commentHeader}>
          <span className={styles.commentAuthor}>
            {author}
            {isBot && (
              <span style={{
                marginLeft: '6px',
                padding: '1px 6px',
                background: '#10b981',
                color: '#fff',
                borderRadius: '999px',
                fontSize: '0.65rem',
                fontWeight: 600,
                letterSpacing: '0.02em',
                verticalAlign: 'middle',
              }}>BOT</span>
            )}
          </span>
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
            <div className={styles.commentBody}>{renderContent(comment.content)}</div>
            {attachments.length > 0 && (
              <div className={styles.commentAttachGrid}>
                {attachments.map(att => {
                  const url = commentAttachmentAPI.getUrl(comment.id, att.id);
                  return (
                    <div key={att.id} className={styles.commentAttachThumb} onClick={() => window.open(url, '_blank')}>
                      {isImageType(att) ? (
                        <img src={url} alt={att.originalFilename || '첨부'} className={styles.commentAttachImg} loading="lazy" />
                      ) : (
                        <div className={styles.attachFile}>
                          <span className={styles.attachFileIcon} style={{ fontSize: '1.2rem' }}>{getFileIcon(att.originalFilename)}</span>
                          <span className={styles.attachFileName}>{att.originalFilename || '파일'}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            {(isOwner || isMaster) && (
              <div className={styles.commentActions}>
                {isOwner && (
                  <button
                    className={styles.commentEditBtn}
                    onClick={() => setIsEditing(true)}
                    title="수정"
                  >
                    수정
                  </button>
                )}
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
