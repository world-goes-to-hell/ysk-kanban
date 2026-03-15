import { getPriorityClass, getPriorityLabel, formatDueDate } from '../../utils/formatters';
import styles from '../../styles/dashboard.module.css';

export default function DashboardList({ items, emptyText, onItemClick }) {
  if (!items || items.length === 0) {
    return <p className={styles.empty}>{emptyText}</p>;
  }

  return (
    <>
      {items.map(item => {
        const dueInfo = item.status !== 'DONE' ? formatDueDate(item.dueDate) : null;
        return (
          <div
            key={item.id}
            className={styles.listItem}
            onClick={() => onItemClick?.(item.id, item.project?.id)}
          >
            <span className={styles.listKey}>#{item.id}</span>
            <span className={styles.listSummary}>{item.summary}</span>
            {dueInfo && (
              <span className={`${styles.listDue} ${styles[`listDue${dueInfo.status.charAt(0).toUpperCase() + dueInfo.status.slice(1)}`] || ''}`}>
                {dueInfo.text}
              </span>
            )}
            <span className={`card-priority ${getPriorityClass(item.priority)}`}
              style={{ fontSize: '0.68rem', fontWeight: 600, padding: '2px 8px', borderRadius: '20px', flexShrink: 0, letterSpacing: '0.02em' }}
            >
              {getPriorityLabel(item.priority)}
            </span>
          </div>
        );
      })}
    </>
  );
}
