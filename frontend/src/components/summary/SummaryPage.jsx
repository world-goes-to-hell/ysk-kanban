import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import todoAPI from '../../api/todos';
import commentAPI from '../../api/comments';
import attachmentAPI from '../../api/attachments';
import commentAttachmentAPI from '../../api/commentAttachments';
import styles from '../../styles/summary.module.css';

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return '방금 전';
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}일 전`;
  return new Date(dateStr).toLocaleDateString();
}

function isImage(att) {
  return att.contentType?.startsWith('image/');
}

export default function SummaryPage() {
  const { todoId } = useParams();
  const [todo, setTodo] = useState(null);
  const [comments, setComments] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [commentAttachMap, setCommentAttachMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [commentInput, setCommentInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const feedBottomRef = useRef(null);

  const loadComments = useCallback(async () => {
    const commentsData = await commentAPI.list(todoId);
    const sorted = (commentsData || []).sort(
      (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
    );
    setComments(sorted);

    const map = {};
    await Promise.all(
      sorted.map(async (c) => {
        try {
          const atts = await commentAttachmentAPI.list(c.id);
          if (atts?.length) map[c.id] = atts;
        } catch { /* ignore */ }
      })
    );
    setCommentAttachMap(map);
  }, [todoId]);

  useEffect(() => {
    if (!todoId) return;

    Promise.all([
      todoAPI.get(todoId),
      commentAPI.list(todoId),
      attachmentAPI.list(todoId),
    ])
      .then(async ([todoData, commentsData, attachData]) => {
        setTodo(todoData);
        setAttachments(attachData || []);

        const sorted = (commentsData || []).sort(
          (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
        );
        setComments(sorted);

        const map = {};
        await Promise.all(
          sorted.map(async (c) => {
            try {
              const atts = await commentAttachmentAPI.list(c.id);
              if (atts?.length) map[c.id] = atts;
            } catch { /* ignore */ }
          })
        );
        setCommentAttachMap(map);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [todoId]);

  const handleAddComment = async () => {
    const content = commentInput.trim();
    if (!content || submitting) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      await commentAPI.create(todoId, content);
      setCommentInput('');
      await loadComments();
      feedBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    } catch {
      setSubmitError('댓글 등록에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('이 댓글을 삭제하시겠습니까?')) return;
    try {
      await commentAPI.delete(todoId, commentId);
      await loadComments();
    } catch {
      alert('댓글 삭제에 실패했습니다.');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAddComment();
    }
  };

  if (loading) {
    return <div className={styles.loading}>불러오는 중...</div>;
  }

  if (!todo) {
    return <div className={styles.loading}>일감을 찾을 수 없습니다.</div>;
  }

  const imageAttachments = attachments.filter(isImage);

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.title}>{todo.summary || todo.title}</h1>
        {todo.description && (
          <p className={styles.description}>{todo.description}</p>
        )}
      </div>

      {/* Gallery - image attachments only */}
      {imageAttachments.length > 0 && (
        <div className={styles.gallery}>
          <div className={styles.galleryGrid}>
            {imageAttachments.map((att) => (
              <img
                key={att.id}
                className={styles.galleryImg}
                src={attachmentAPI.getUrl(todoId, att.id)}
                alt={att.originalFilename}
                onClick={() => window.open(attachmentAPI.getUrl(todoId, att.id), '_blank')}
              />
            ))}
          </div>
        </div>
      )}

      {/* Divider if both images and comments exist */}
      {imageAttachments.length > 0 && comments.length > 0 && (
        <hr className={styles.divider} />
      )}

      {/* Comment Feed */}
      {comments.length > 0 ? (
        <div className={styles.feed}>
          {comments.map((comment) => {
            const cAtts = commentAttachMap[comment.id] || [];
            const cImages = cAtts.filter(isImage);
            const author = comment.author?.displayName || comment.author?.username || comment.authorName || '알 수 없음';
            const authorInitial = author.charAt(0).toUpperCase();

            return (
              <div key={comment.id} className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.avatar}>{authorInitial}</div>
                  <span className={styles.authorName}>{author}</span>
                  <span className={styles.dot}>&middot;</span>
                  <span className={styles.timeAgo}>
                    {timeAgo(comment.createdAt)}
                  </span>
                  <button
                    className={styles.cardDeleteBtn}
                    onClick={() => handleDeleteComment(comment.id)}
                    title="댓글 삭제"
                  >
                    &times;
                  </button>
                </div>

                {cImages.length > 0 && (
                  <div className={styles.cardImages}>
                    {cImages.map((att) => (
                      <img
                        key={att.id}
                        className={styles.cardImg}
                        src={commentAttachmentAPI.getUrl(comment.id, att.id)}
                        alt={att.originalFilename}
                      />
                    ))}
                  </div>
                )}

                {comment.content && (
                  <div className={styles.cardBody}>{comment.content}</div>
                )}
              </div>
            );
          })}
          <div ref={feedBottomRef} />
        </div>
      ) : (
        <div className={styles.empty}>아직 댓글이 없습니다. 첫 댓글을 남겨보세요.</div>
      )}

      {/* Comment Input */}
      <div className={styles.commentInputSection}>
        <textarea
          className={styles.commentTextarea}
          placeholder="댓글을 입력하세요... (Enter로 등록, Shift+Enter로 줄바꿈)"
          rows={3}
          value={commentInput}
          onChange={e => setCommentInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={submitting}
        />
        {submitError && <p className={styles.submitError}>{submitError}</p>}
        <button
          className={styles.submitBtn}
          onClick={handleAddComment}
          disabled={submitting || !commentInput.trim()}
        >
          {submitting ? '등록 중...' : '댓글 등록'}
        </button>
      </div>
    </div>
  );
}
