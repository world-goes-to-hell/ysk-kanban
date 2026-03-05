import { getPriorityClass, getPriorityLabel, formatStatus, formatTime, formatDueDate } from '../../utils/formatters';
import styles from '../../styles/detail.module.css';

const STATUS_STYLE_MAP = {
  TODO: styles.statusTodo,
  IN_PROGRESS: styles.statusInProgress,
  DONE: styles.statusDone,
};

export default function DetailInfo({ item, projects }) {
  if (!item) return null;

  const project = item.projectId
    ? projects?.find(p => String(p.id) === String(item.projectId))
    : null;
  const dueInfo = item.status !== 'DONE' ? formatDueDate(item.dueDate) : null;

  return (
    <div>
      {/* Header: Title + Badges */}
      <div className={styles.detailHeader}>
        <h2 className={styles.detailTitle}>{item.summary}</h2>
        <div className={styles.detailBadges}>
          <span className={`${styles.statusBadge} ${STATUS_STYLE_MAP[item.status] || ''}`}>
            {formatStatus(item.status)}
          </span>
          <span className={`${styles.priorityBadge} ${getPriorityClass(item.priority)}`}>
            {getPriorityLabel(item.priority)}
          </span>
        </div>
      </div>

      {/* Description Card */}
      {item.description && (
        <div className={styles.descriptionCard}>
          <div className={styles.descriptionLabel}>설명</div>
          <div className={styles.descriptionText}>{item.description}</div>
        </div>
      )}

      {/* Meta Grid */}
      <div className={styles.metaGrid}>
        {project && (
          <div className={styles.metaCard}>
            <div className={styles.metaLabel}>프로젝트</div>
            <div className={styles.metaValue}>{project.name || project.projectKey}</div>
          </div>
        )}
        {item.dueDate && (
          <div className={styles.metaCard}>
            <div className={styles.metaLabel}>마감기한</div>
            <div className={styles.metaValue}>
              {item.dueDate}
              {dueInfo && (
                <span style={{
                  marginLeft: '8px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: '10px',
                  background: dueInfo.status === 'overdue' ? '#fee2e2' : dueInfo.status === 'safe' ? '#eff6ff' : '#fff7ed',
                  color: dueInfo.status === 'overdue' ? '#dc2626' : dueInfo.status === 'safe' ? '#2563eb' : '#ea580c',
                }}>
                  {dueInfo.text}
                </span>
              )}
            </div>
          </div>
        )}
        {item.assignees?.length > 0 && (
          <div className={styles.metaCard}>
            <div className={styles.metaLabel}>담당자</div>
            <div className={styles.metaValue}>
              {item.assignees.map(a => a.displayName || a.username).join(', ')}
            </div>
          </div>
        )}
        {item.createdBy && (
          <div className={styles.metaCard}>
            <div className={styles.metaLabel}>작성자</div>
            <div className={styles.metaValue}>{item.createdBy.displayName || item.createdBy.username}</div>
          </div>
        )}
        {item.createdAt && (
          <div className={styles.metaCard}>
            <div className={styles.metaLabel}>생성일</div>
            <div className={styles.metaValue}>{formatTime(item.createdAt)}</div>
          </div>
        )}
        {item.updatedAt && (
          <div className={styles.metaCard}>
            <div className={styles.metaLabel}>수정일</div>
            <div className={styles.metaValue}>{formatTime(item.updatedAt)}</div>
          </div>
        )}
      </div>
    </div>
  );
}
