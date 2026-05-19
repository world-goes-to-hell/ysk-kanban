import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { DragDropContext } from '@hello-pangea/dnd';
import { useAuth } from '../../contexts/AuthContext';
import { useProjects } from '../../contexts/ProjectContext';
import { useTodos } from '../../hooks/useTodos';
import { useUnreadComments } from '../../hooks/useUnreadComments';
import { useTodoSync } from '../../hooks/useTodoSync';
import statusAPI from '../../api/statuses';
import KanbanColumn from './KanbanColumn';
import TransitionDropdown from './TransitionDropdown';
import FilterBar from './FilterBar';
import TodoModal from '../todo/TodoModal';
import DetailModal from '../detail/DetailModal';
import ConfirmDialog from '../common/ConfirmDialog';
import ProjectSettingsModal from './ProjectSettingsModal';
import styles from '../../styles/board.module.css';

const DEFAULT_STATUS_COLUMNS = [
  { statusKey: 'TODO', name: '할 일', semanticStatus: 'TODO', position: 0, systemStatus: true, color: '#2563EB' },
  { statusKey: 'IN_PROGRESS', name: '진행 중', semanticStatus: 'IN_PROGRESS', position: 1, systemStatus: true, color: '#D97706' },
  { statusKey: 'DONE', name: '완료', semanticStatus: 'DONE', position: 2, systemStatus: true, color: '#059669' },
];

export default function BoardPage() {
  const { projectId } = useParams();
  const { currentUser } = useAuth();
  const { projects, myRoles } = useProjects();
  const { todos, setTodos, loadTodos, changeStatus, reorderTodos, deleteTodo } = useTodos();
  const { unreadCounts, loadUnreadCounts, markAsRead } = useUnreadComments();

  const [todoModal, setTodoModal] = useState(null); // null | { mode, item, initialStatus }
  const [detailTodoId, setDetailTodoId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [transition, setTransition] = useState(null); // { item, anchorRect }
  const [compact, setCompact] = useState(false);
  const [filters, setFilters] = useState({ keyword: '', priority: '', assigneeId: '' });
  const [statuses, setStatuses] = useState([]);
  const [sortByStatus, setSortByStatus] = useState({});
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  const project = projects.find(p => String(p.id) === String(projectId));
  const title = project ? (project.name || project.projectKey) : '일감';
  const columns = useMemo(() => statuses.length > 0 ? statuses : DEFAULT_STATUS_COLUMNS, [statuses]);
  const statusKeys = useMemo(() => columns.map(status => status.statusKey), [columns]);

  const loadStatuses = useCallback(async () => {
    if (!projectId) {
      setStatuses(DEFAULT_STATUS_COLUMNS);
      return;
    }
    try {
      const data = await statusAPI.list(projectId);
      setStatuses(Array.isArray(data) && data.length > 0 ? data : DEFAULT_STATUS_COLUMNS);
    } catch (_) {
      setStatuses(DEFAULT_STATUS_COLUMNS);
    }
  }, [projectId]);

  useEffect(() => {
    loadTodos(projectId);
  }, [projectId, loadTodos]);

  useEffect(() => {
    loadStatuses();
  }, [loadStatuses]);

  useEffect(() => {
    setSortByStatus(prev => {
      const next = {};
      statusKeys.forEach(key => {
        next[key] = prev[key] || 'default';
      });
      const prevKeys = Object.keys(prev);
      const changed = prevKeys.length !== statusKeys.length
        || statusKeys.some(key => prev[key] !== next[key]);
      return changed ? next : prev;
    });
  }, [statusKeys]);

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

  // 토론 시작/종료 시 해당 카드의 hasActiveDiscussion 토글
  useEffect(() => {
    const onStarted = (e) => {
      const todoId = Number(e.detail?.todoId);
      if (!todoId) return;
      setTodos(prev => prev.map(t => Number(t.id) === todoId ? { ...t, hasActiveDiscussion: true } : t));
    };
    const onEnded = (e) => {
      const todoId = Number(e.detail?.todoId);
      if (!todoId) return;
      setTodos(prev => prev.map(t => Number(t.id) === todoId ? { ...t, hasActiveDiscussion: false } : t));
    };
    window.addEventListener('discussion_started', onStarted);
    window.addEventListener('discussion_ended', onEnded);
    return () => {
      window.removeEventListener('discussion_started', onStarted);
      window.removeEventListener('discussion_ended', onEnded);
    };
  }, [setTodos]);

  const reload = useCallback(() => {
    loadTodos(projectId);
  }, [projectId, loadTodos]);

  const reloadBoard = useCallback(() => {
    loadStatuses();
    loadTodos(projectId);
  }, [projectId, loadTodos, loadStatuses]);

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

  const sortItems = useCallback((items, sortKey) => {
    if (sortKey === 'default') return items;
    const sorted = [...items];
    const priorityOrder = { HIGHEST: 0, HIGH: 1, MEDIUM: 2, LOW: 3, LOWEST: 4 };
    switch (sortKey) {
      case 'priority-high':
        return sorted.sort((a, b) => (priorityOrder[a.priority] ?? 9) - (priorityOrder[b.priority] ?? 9));
      case 'priority-low':
        return sorted.sort((a, b) => (priorityOrder[b.priority] ?? 9) - (priorityOrder[a.priority] ?? 9));
      case 'newest':
        return sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      case 'oldest':
        return sorted.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      case 'due-asc':
        return sorted.sort((a, b) => {
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(a.dueDate) - new Date(b.dueDate);
        });
      case 'completed-desc':
        return sorted.sort((a, b) => {
          if (!a.completedAt) return 1;
          if (!b.completedAt) return -1;
          return new Date(b.completedAt) - new Date(a.completedAt);
        });
      default:
        return sorted;
    }
  }, []);

  const getTodoStatusKey = useCallback((todo) => todo.statusKey || todo.status || statusKeys[0], [statusKeys]);

  const todosByStatus = {};
  statusKeys.forEach(s => { todosByStatus[s] = []; });
  filteredTodos.forEach(t => {
    const key = getTodoStatusKey(t);
    if (todosByStatus[key]) {
      todosByStatus[key].push(t);
    } else if (todosByStatus[t.status]) {
      todosByStatus[t.status].push(t);
    } else if (statusKeys.length > 0) {
      todosByStatus[statusKeys[0]].push(t);
    }
  });
  statusKeys.forEach(s => {
    todosByStatus[s] = sortItems(todosByStatus[s], sortByStatus[s] || 'default');
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
        const others = prev.filter(t => getTodoStatusKey(t) !== newStatus);
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
          <button className={styles.viewToggle} onClick={() => setShowSettingsModal(true)}>
            설정
          </button>
          <button className="btn btn-primary" onClick={() => setTodoModal({ mode: 'create', item: null })}>
            <span className="btn-icon-text">+</span> 새 일감
          </button>
        </div>
      </div>

      <FilterBar filters={filters} onFilterChange={setFilters} todos={todos} />

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className={styles.board}>
          {columns.map(column => {
            const status = column.statusKey;
            return (
              <KanbanColumn
                key={status}
                status={status}
                column={column}
                items={todosByStatus[status]}
                unreadCounts={unreadCounts}
                compact={compact}
                sortKey={sortByStatus[status] || 'default'}
                onSortChange={(val) => setSortByStatus(prev => ({ ...prev, [status]: val }))}
                onTransition={handleTransition}
                onEdit={(item) => setTodoModal({ mode: 'edit', item })}
                onDelete={handleDelete}
                onCardClick={(item) => setDetailTodoId(item.id)}
                onAddTodo={() => setTodoModal({ mode: 'create', item: null, initialStatus: status })}
                currentUser={currentUser}
                isMaster={myRoles[Number(projectId)] === 'MASTER'}
              />
            );
          })}
        </div>
      </DragDropContext>

      {transition && (
        <TransitionDropdown
          currentStatus={transition.item.statusKey || transition.item.status}
          statuses={columns}
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
          initialStatus={todoModal.initialStatus}
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

      {showSettingsModal && project && (
        <ProjectSettingsModal
          project={project}
          onClose={() => setShowSettingsModal(false)}
          onUpdated={reloadBoard}
        />
      )}
    </>
  );
}
