import { useEffect, useState, useRef, useCallback } from 'react';
import { useProjects } from '../../contexts/ProjectContext';
import { useComments } from '../../hooks/useComments';
import { useAttachments } from '../../hooks/useAttachments';
import todoAPI from '../../api/todos';
import Modal from '../common/Modal';
import DetailInfo from './DetailInfo';
import AttachmentGrid from './AttachmentGrid';
import CommentSection from './CommentSection';

export default function DetailModal({ todoId, todos, onClose, onMarkRead }) {
  const { projects } = useProjects();
  const { comments, loadComments, addComment, updateComment, deleteComment } = useComments(todoId);
  const { attachments, loadAttachments, deleteAttachment, getUrl } = useAttachments(todoId);
  const [fetchedItem, setFetchedItem] = useState(null);
  const loadCommentsRef = useRef(loadComments);
  loadCommentsRef.current = loadComments;

  useEffect(() => {
    if (todoId) {
      loadComments();
      loadAttachments();
      onMarkRead?.(todoId);
    }
  }, [todoId, loadComments, loadAttachments, onMarkRead]);

  // 댓글 실시간 갱신 — 모달이 열려있으면 새 댓글도 즉시 읽음 처리
  useEffect(() => {
    if (!todoId) return;
    const handler = (e) => {
      if (String(e.detail?.todoId) === String(todoId)) {
        loadCommentsRef.current();
        onMarkRead?.(todoId);
      }
    };
    window.addEventListener('comment_changed', handler);
    return () => window.removeEventListener('comment_changed', handler);
  }, [todoId, onMarkRead]);

  const item = todos?.find(t => String(t.id) === String(todoId));

  useEffect(() => {
    if (todoId && !item) {
      todoAPI.get(todoId).then(setFetchedItem).catch(() => {});
    }
  }, [todoId, item]);

  const handleSummary = () => {
    window.open(`/todos/${todoId}/summary`, '_blank', 'width=680,height=900');
  };

  return (
    <Modal
      title={`일감 #${todoId} 상세`}
      wide
      onClose={onClose}
      headerRight={
        <button
          onClick={handleSummary}
          style={{
            background: 'none',
            border: '1px solid var(--border-medium)',
            borderRadius: 'var(--radius-sm)',
            padding: '4px 12px',
            fontSize: '0.78rem',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
          }}
        >
          새창보기
        </button>
      }
    >
      <DetailInfo item={item || fetchedItem} projects={projects} />
      <AttachmentGrid
        attachments={attachments}
        getUrl={getUrl}
        onDelete={deleteAttachment}
      />
      <CommentSection
        comments={comments}
        onAdd={addComment}
        onEdit={updateComment}
        onDelete={deleteComment}
      />
    </Modal>
  );
}
