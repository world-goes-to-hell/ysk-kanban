import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { DragDropContext } from '@hello-pangea/dnd';
import { useProjects } from '../../contexts/ProjectContext';
import { useTodos } from '../../hooks/useTodos';
import { useUnreadComments } from '../../hooks/useUnreadComments';
import { useTodoSync } from '../../hooks/useTodoSync';
import { STATUSES } from '../../utils/constants';
import KanbanColumn from './KanbanColumn';
import TransitionDropdown from './TransitionDropdown';
import FilterBar from './FilterBar';
import TodoModal from '../todo/TodoModal';
import DetailModal from '../detail/DetailModal';
import ConfirmDialog from '../common/ConfirmDialog';
import styles from '../../styles/board.module.css';

export default function BoardPage() {
  const { projectId } = useParams();
  const { projects } = useProjects();
  const { todos, setTodos, loadTodos, changeStatus, reorderTodos, deleteTodo } = useTodos();
  const { unreadCounts, loadUnreadCounts, markAsRead } = useUnreadComments();

  const [todoModal, setTodoModal] = useState(null); // null | { mode, item }
  const [detailTodoId, setDetailTodoId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [transition, setTransition] = useState(null); // { item, anchorRect }
  const [compact, setCompact] = useState(false);
  const [filters, setFilters] = useState({ keyword: '', priority: '', assigneeId: '' });

  const project = projects.find(p => String(p.id) === String(projectId));
  const title = project ? (project.name || project.projectKey) : '일감';

  useEffect(() => {
    loadTodos(projectId);
  }, [projectId, loadTodos]);

  useEffect(() => {
    if (todos.length > 0) {
      const ids = todos.map(t => t.id);
      loadUnreadCounts(ids);
    }
  }, [todos, loadUnreadCounts]);

  // 댓글 변경 시 미읽음 카운트 실시간 갱신
  useEffect(() => {
    const handler = () => {
      if (todos.length > 0) {
        loadUnreadCounts(todos.map(t => t.id));
      }
    };
    window.addEventListener('comment_changed', handler);
    return () => window.removeEventListener('comment_changed', handler);
  }, [todos, loadUnreadCounts]);

  const reload = useCallback(() => {
    loadTodos(projectId);
  }, [projectId, loadTodos]);

  // 다른 사용자의 변경사항 실시간 수신
  useTodoSync(projectId, reload);

  const filteredTodos = useMemo(() => {
    return todos.filter(t => {
      if (filters.keyword) {
        const kw = filters.keyword.toLowerCase();
        const matchSummary = t.summary?.toLowerCase().includes(kw);
        const matchDesc = t.description?.toLowerCase().includes(kw);
        if (!matchSummary && !matchDesc) return false;
      }
      if (filters.priority && t.priority !== filters.priority) return false;
      if (filters.assigneeId && !t.assignees?.some(a => String(a.id) === filters.assigneeId)) return false;
      return true;
    });
  }, [todos, filters]);

  const todosByStatus = {};
  STATUSES.forEach(s => { todosByStatus[s] = []; });
  filteredTodos.forEach(t => {
    if (todosByStatus[t.status]) {
      todosByStatus[t.status].push(t);
    }
  });

  const handleDragEnd = async (result) => {
    if (!result.destination) return;
    const { draggableId, source, destination } = result;
    const newStatus = destination.droppableId;
    const item = todos.find(t => String(t.id) === draggableId);
    if (!item) return;

    // 같은 컬럼 내 순서 변경
    if (source.droppableId === destination.droppableId) {
      if (source.index === destination.index) return;
      const columnItems = [...todosByStatus[newStatus]];
      const [moved] = columnItems.splice(source.index, 1);
      columnItems.splice(destination.index, 0, moved);
      const orderedIds = columnItems.map(t => t.id);
      // 낙관적 UI: todos 상태 즉시 갱신
      setTodos(prev => {
        const others = prev.filter(t => t.status !== newStatus);
        const reordered = columnItems.map((t, i) => ({ ...t, sortOrder: i }));
        return [...others, ...reordered];
      });
      try {
        await reorderTodos(orderedIds);
      } catch (_) {
        reload(); // 실패 시 서버 데이터로 원복
      }
      return;
    }

    // 다른 컬럼으로 이동 (기존 상태 변경 로직)
    try {
      await changeStatus(draggableId, newStatus);
      reload();
    } catch (_) {}
  };

  const handleTransition = (item, e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTransition({ item, anchorRect: rect });
  };

  const handleTransitionSelect = async (status) => {
    if (!transition) return;
    const id = transition.item.id;
    setTransition(null);
    try {
      await changeStatus(id, status);
      reload();
    } catch (_) {}
  };

  const handleDelete = (item) => {
    setConfirmDelete(item);
  };

  const confirmDeleteTodo = async () => {
    if (!confirmDelete) return;
    const id = confirmDelete.id;
    setConfirmDelete(null);
    try {
      await deleteTodo(id);
      reload();
    } catch (_) {}
  };

  return (
    <>
      <div className={styles.boardToolbar}>
        <h2 className={styles.boardTitle}>{title}</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            className={`${styles.viewToggle} ${compact ? styles.viewToggleActive : ''}`}
            onClick={() => setCompact(prev => !prev)}
          >
            {compact ? '☰ 일반 보기' : '≡ 축소 보기'}
          </button>
          <button className="btn btn-primary" onClick={() => setTodoModal({ mode: 'create', item: null })}>
            <span className="btn-icon-text">+</span> 새 일감
          </button>
        </div>
      </div>

      <FilterBar filters={filters} onFilterChange={setFilters} todos={todos} />

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className={styles.board}>
          {STATUSES.map(status => (
            <KanbanColumn
              key={status}
              status={status}
              items={todosByStatus[status]}
              unreadCounts={unreadCounts}
              compact={compact}
              onTransition={handleTransition}
              onEdit={(item) => setTodoModal({ mode: 'edit', item })}
              onDelete={handleDelete}
              onCardClick={(item) => setDetailTodoId(item.id)}
            />
          ))}
        </div>
      </DragDropContext>

      {transition && (
        <TransitionDropdown
          currentStatus={transition.item.status}
          anchorRect={transition.anchorRect}
          onSelect={handleTransitionSelect}
          onClose={() => setTransition(null)}
        />
      )}

      {todoModal && (
        <TodoModal
          mode={todoModal.mode}
          item={todoModal.item}
          projectId={projectId}
          onClose={() => setTodoModal(null)}
          onSaved={reload}
        />
      )}

      {detailTodoId && (
        <DetailModal
          todoId={detailTodoId}
          todos={todos}
          onClose={() => { setDetailTodoId(null); reload(); }}
          onMarkRead={markAsRead}
        />
      )}

      {confirmDelete && (
        <ConfirmDialog
          message={`일감 #${confirmDelete.id}을(를) 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`}
          onConfirm={confirmDeleteTodo}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </>
  );
}
