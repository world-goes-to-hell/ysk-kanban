import { useEffect, useState, useRef, useCallback } from 'react';
import { useProjects } from '../../contexts/ProjectContext';
import { useComments } from '../../hooks/useComments';
import { useAttachments } from '../../hooks/useAttachments';
import todoAPI from '../../api/todos';
import Modal from '../common/Modal';
import DetailInfo from './DetailInfo';
import AttachmentGrid from './AttachmentGrid';
import CommentSection from './CommentSection';
import ActivityTimeline from './ActivityTimeline';
import SubtaskBoard from './SubtaskBoard';
import AgentChatPanel from './AgentChatPanel';
import detailStyles from '../../styles/detail.module.css';

export default function DetailModal({ todoId, todos, onClose, onMarkRead }) {
  const { projects, myRoles } = useProjects();
  const [trail, setTrail] = useState([]);
  const [currentTodoId, setCurrentTodoId] = useState(todoId);

  // 부모가 새 todoId를 주입하면 현재 위치 초기화 (다른 일감으로 점프)
  useEffect(() => {
    setCurrentTodoId(todoId);
    setTrail([]);
  }, [todoId]);

  const { comments, loadComments, addComment, updateComment, deleteComment } = useComments(currentTodoId);
  const { attachments, loadAttachments, deleteAttachment, getUrl } = useAttachments(currentTodoId);
  const [fetchedItem, setFetchedItem] = useState(null);
  const [subtasks, setSubtasks] = useState([]);
  const loadCommentsRef = useRef(loadComments);
  loadCommentsRef.current = loadComments;

  const loadSubtasks = useCallback(() => {
    if (currentTodoId) {
      todoAPI.subtasks(currentTodoId).then(setSubtasks).catch(() => setSubtasks([]));
    }
  }, [currentTodoId]);

  useEffect(() => {
    if (currentTodoId) {
      loadComments();
      loadAttachments();
      loadSubtasks();
      onMarkRead?.(currentTodoId);
    }
  }, [currentTodoId, loadComments, loadAttachments, loadSubtasks, onMarkRead]);

  // 댓글 실시간 갱신 — 모달이 열려있으면 새 댓글도 즉시 읽음 처리
  useEffect(() => {
    if (!currentTodoId) return;
    const handler = (e) => {
      if (String(e.detail?.todoId) === String(currentTodoId)) {
        loadCommentsRef.current();
        onMarkRead?.(currentTodoId);
      }
    };
    window.addEventListener('comment_changed', handler);
    return () => window.removeEventListener('comment_changed', handler);
  }, [currentTodoId, onMarkRead]);

  const item = todos?.find(t => String(t.id) === String(currentTodoId));

  useEffect(() => {
    if (currentTodoId && !item) {
      todoAPI.get(currentTodoId).then(setFetchedItem).catch(() => {});
    } else if (item) {
      setFetchedItem(null);
    }
  }, [currentTodoId, item]);

  const handleSummary = () => {
    window.open(`/todos/${currentTodoId}/summary`, '_blank', 'width=680,height=900');
  };

  const handleOpenSubtask = useCallback((subtaskId) => {
    setTrail(prev => [...prev, currentTodoId]);
    setCurrentTodoId(subtaskId);
  }, [currentTodoId]);

  const handleBack = useCallback(() => {
    setTrail(prev => {
      if (prev.length === 0) return prev;
      const next = prev.slice(0, -1);
      setCurrentTodoId(prev[prev.length - 1]);
      return next;
    });
  }, []);

  const currentItem = item || fetchedItem;
  const hasSubtasks = subtasks.length > 0;

  return (
    <Modal
      title={
        trail.length > 0
          ? `일감 #${trail[0]} › ... › #${currentTodoId} 상세`
          : `일감 #${currentTodoId} 상세`
      }
      wide
      extraWide={hasSubtasks}
      onClose={onClose}
      headerRight={
        <div style={{ display: 'flex', gap: '6px' }}>
          {trail.length > 0 && (
            <button
              onClick={handleBack}
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
              ← 상위
            </button>
          )}
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
        </div>
      }
    >
      <div className={hasSubtasks ? detailStyles.detailTwoPanel : undefined}>
        <div>
          <DetailInfo item={currentItem} projects={projects} />
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
            projectId={currentItem?.project?.id}
            isMaster={myRoles[currentItem?.project?.id] === 'MASTER'}
          />
          <ActivityTimeline todoId={currentTodoId} />
          <AgentChatPanel
            todoId={currentTodoId}
            defaultAgentName={
              currentItem?.assignees?.find(a => a?.bot)?.displayName
              || currentItem?.assignees?.find(a => a?.bot)?.username
              || 'agent'
            }
          />
        </div>
        {hasSubtasks && (
          <SubtaskBoard
            parentId={currentTodoId}
            subtasks={subtasks}
            onRefresh={loadSubtasks}
            onOpenSubtask={handleOpenSubtask}
          />
        )}
      </div>
    </Modal>
  );
}
