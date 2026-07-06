import { useState } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { getPriorityClass, getPriorityLabel, formatStatus, formatTime, formatDueDate, getBotColor } from '../../utils/formatters';
import styles from '../../styles/detail.module.css';

const STATUS_STYLE_MAP = {
  TODO: styles.statusTodo,
  IN_PROGRESS: styles.statusInProgress,
  DONE: styles.statusDone,
};

const RAIL_MAP = {
  TODO: styles.railTodo,
  IN_PROGRESS: styles.railInProgress,
  DONE: styles.railDone,
};

const DUE_CLASS = {
  overdue: styles.dueOverdue,
  today: styles.dueSoon,
  soon: styles.dueSoon,
  safe: styles.dueSafe,
};

const AVATAR_COLORS = [
  '#4f46e5', '#7c3aed', '#db2777', '#ea580c',
  '#0891b2', '#059669', '#d97706', '#6366f1',
];

function avatarColor(seed) {
  const s = String(seed ?? '');
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = ((hash << 5) - hash + s.charCodeAt(i)) | 0;
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name) {
  if (!name) return '?';
  const trimmed = name.trim();
  return trimmed.length <= 2 ? trimmed : trimmed.slice(0, 2);
}

function Person({ user }) {
  if (!user) return null;
  const name = user.displayName || user.username || '';
  if (user.bot) {
    const c = getBotColor(name);
    return (
      <span className={styles.person} title={name}>
        <span
          className={styles.avatar}
          style={{ background: c.bg, color: c.color, border: `1px solid ${c.border}` }}
        >
          🤖
        </span>
        <span className={styles.personName}>{name}</span>
      </span>
    );
  }
  return (
    <span className={styles.person} title={name}>
      <span className={styles.avatar} style={{ background: avatarColor(user.id ?? name) }}>
        {getInitials(name)}
      </span>
      <span className={styles.personName}>{name}</span>
    </span>
  );
}

export default function DetailInfo({ item, projects }) {
  const [rawView, setRawView] = useState(false);

  if (!item) return null;

  const project = item.projectId
    ? projects?.find(p => String(p.id) === String(item.projectId))
    : null;
  const dueInfo = item.status !== 'DONE' ? formatDueDate(item.dueDate) : null;

  const calcDuration = () => {
    if (!item.createdAt) return null;
    if (item.status === 'TODO') return null;
    const start = new Date(item.createdAt);
    const end = item.completedAt ? new Date(item.completedAt) : new Date();
    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    return days;
  };
  const duration = calcDuration();

  return (
    <div>
      {/* Title Hero */}
      <div className={`${styles.titleBlock} ${RAIL_MAP[item.status] || ''}`}>
        <div className={styles.idRow}>
          <span className={styles.idChip}>#{item.id}</span>
          {project && (
            <span className={styles.projectChip}>{project.name || project.projectKey}</span>
          )}
        </div>
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
          <div className={styles.descriptionLabelRow}>
            <div className={styles.descriptionLabel}>설명</div>
            <button
              className={`${styles.mdToggleBtn} ${rawView ? '' : styles.mdToggleBtnActive}`}
              onClick={() => setRawView(prev => !prev)}
            >
              {rawView ? 'Markdown' : '원문 보기'}
            </button>
          </div>
          {rawView ? (
            <div className={styles.descriptionText}>{item.description}</div>
          ) : (
            <div className={styles.mdContent}>
              <Markdown remarkPlugins={[remarkGfm, remarkBreaks]}>{item.description}</Markdown>
            </div>
          )}
        </div>
      )}

      {/* Property List */}
      <div className={styles.propList}>
        {item.assignees?.length > 0 && (
          <div className={styles.propRow}>
            <span className={styles.propLabel}>담당자</span>
            <div className={styles.propValue}>
              {item.assignees.map(a => <Person key={a.id} user={a} />)}
            </div>
          </div>
        )}
        {item.createdBy && (
          <div className={styles.propRow}>
            <span className={styles.propLabel}>작성자</span>
            <div className={styles.propValue}>
              <Person user={item.createdBy} />
            </div>
          </div>
        )}
        {item.dueDate && (
          <div className={styles.propRow}>
            <span className={styles.propLabel}>마감기한</span>
            <div className={styles.propValue}>
              <span className={styles.propDate}>{item.dueDate}</span>
              {dueInfo && (
                <span className={`${styles.dueBadge} ${DUE_CLASS[dueInfo.status] || ''}`}>
                  {dueInfo.text}
                </span>
              )}
            </div>
          </div>
        )}
        {item.createdAt && (
          <div className={styles.propRow}>
            <span className={styles.propLabel}>작업 기간</span>
            <div className={`${styles.propValue} ${styles.durationRow}`}>
              <span className={styles.propDate}>{formatTime(item.createdAt)}</span>
              <span className={styles.durationArrow}>→</span>
              {item.completedAt ? (
                <span className={styles.durationEndDone}>{formatTime(item.completedAt)}</span>
              ) : item.status === 'IN_PROGRESS' ? (
                <span className={styles.durationEndProgress}>진행중</span>
              ) : (
                <span className={styles.durationEndProgress}>대기중</span>
              )}
              {duration !== null && (
                <span className={item.completedAt ? styles.durationBadgeDone : styles.durationBadgeProgress}>
                  {duration}일
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
