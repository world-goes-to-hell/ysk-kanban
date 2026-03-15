import { useState } from 'react';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import TodoCard from './TodoCard';
import EmptyState from './EmptyState';
import styles from '../../styles/board.module.css';

const COLUMN_CONFIG = {
  TODO: {
    title: '할 일',
    dotClass: styles.dotTodo,
    badgeClass: styles.badgeTodo,
  },
  IN_PROGRESS: {
    title: '진행 중',
    dotClass: styles.dotInprogress,
    badgeClass: styles.badgeInprogress,
  },
  DONE: {
    title: '완료',
    dotClass: styles.dotDone,
    badgeClass: styles.badgeDone,
  },
};

function isToday(dateStr) {
  if (!dateStr) return false;
  const itemDate = new Date(dateStr);
  const now = new Date();
  return (
    itemDate.getFullYear() === now.getFullYear() &&
    itemDate.getMonth() === now.getMonth() &&
    itemDate.getDate() === now.getDate()
  );
}

export default function KanbanColumn({ status, items, unreadCounts, onTransition, onEdit, onDelete, onCardClick, onAddTodo, compact, sortKey, onSortChange, currentUser, isMaster }) {
  const config = COLUMN_CONFIG[status];
  const [showOlder, setShowOlder] = useState(false);

  const isDone = status === 'DONE';
  const todayItems = isDone ? items.filter(item => isToday(item.updatedAt)) : items;
  const olderItems = isDone ? items.filter(item => !isToday(item.updatedAt)) : [];
  const visibleItems = isDone ? [...todayItems, ...(showOlder ? olderItems : [])] : items;

  return (
    <section className={styles.column}>
      <div className={styles.columnHeader}>
        <div className={styles.columnHeaderLeft}>
          <span className={`${styles.columnDot} ${config.dotClass}`} />
          <h3 className={styles.columnTitle}>{config.title}</h3>
          <span className={`${styles.columnBadge} ${config.badgeClass}`}>{items.length}</span>
        </div>
        <div className={styles.columnHeaderRight}>
          <button className={styles.columnAddBtn} onClick={onAddTodo} title="일감 추가">+</button>
          <select
            className={styles.columnSort}
            value={sortKey}
            onChange={e => onSortChange(e.target.value)}
          >
          <option value="default">기본 정렬</option>
          <option value="priority-high">우선순위 높은순</option>
          <option value="priority-low">우선순위 낮은순</option>
          <option value="newest">최신 등록순</option>
          <option value="oldest">오래된순</option>
          <option value="due-asc">마감일순</option>
          {status === 'DONE' && <option value="completed-desc">완료일순</option>}
          </select>
        </div>
      </div>
      <Droppable droppableId={status}>
        {(provided, snapshot) => (
          <div
            className={`${styles.columnBody} ${snapshot.isDraggingOver ? styles.columnBodyDragover : ''}`}
            ref={provided.innerRef}
            {...provided.droppableProps}
          >
            {visibleItems.length === 0 && !snapshot.isDraggingOver && <EmptyState />}
            {visibleItems.map((item, index) => (
              <Draggable key={String(item.id)} draggableId={String(item.id)} index={index}>
                {(dragProvided, dragSnapshot) => (
                  <TodoCard
                    item={item}
                    provided={dragProvided}
                    isDragging={dragSnapshot.isDragging}
                    unreadCount={unreadCounts?.[item.id] || 0}
                    compact={compact}
                    canDelete={isMaster || (currentUser && item.createdBy?.id === currentUser.id)}
                    onTransition={(e) => onTransition(item, e)}
                    onEdit={() => onEdit(item)}
                    onDelete={() => onDelete(item)}
                    onClick={() => onCardClick(item)}
                  />
                )}
              </Draggable>
            ))}
            {provided.placeholder}
            {isDone && olderItems.length > 0 && (
              <button
                className={styles.doneToggleBtn}
                onClick={() => setShowOlder(prev => !prev)}
              >
                {showOlder ? '접기' : `더보기 (${olderItems.length}건)`}
              </button>
            )}
          </div>
        )}
      </Droppable>
    </section>
  );
}
