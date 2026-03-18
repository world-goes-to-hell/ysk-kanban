import { PRIORITY_CLASS, PRIORITY_LABEL, STATUS_LABEL } from './constants';

export function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function truncate(text, max = 80) {
  if (!text) return '';
  return text.length > max ? text.slice(0, max).trimEnd() + '...' : text;
}

export function getPriorityClass(priority) {
  if (!priority) return 'priority--lowest';
  const upper = priority.toUpperCase();
  return PRIORITY_CLASS[upper] || 'priority--lowest';
}

export function getPriorityLabel(priority) {
  if (!priority) return '없음';
  const upper = priority.toUpperCase();
  return PRIORITY_LABEL[upper] || priority;
}

export function formatStatus(status) {
  return STATUS_LABEL[status] || status;
}

export function formatTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now - d;

  if (diff < 60000) return '방금 전';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}분 전`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}시간 전`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}일 전`;

  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

const BOT_COLORS = [
  { bg: '#7c3aed20', color: '#7c3aed', border: '#7c3aed40' },
  { bg: '#0891b220', color: '#0891b2', border: '#0891b240' },
  { bg: '#05966920', color: '#059669', border: '#05966940' },
  { bg: '#d9730620', color: '#d97306', border: '#d9730640' },
  { bg: '#dc262620', color: '#dc2626', border: '#dc262640' },
  { bg: '#2563eb20', color: '#2563eb', border: '#2563eb40' },
  { bg: '#c026d320', color: '#c026d3', border: '#c026d340' },
  { bg: '#65a30d20', color: '#65a30d', border: '#65a30d40' },
];

export function getBotColor(name) {
  if (!name) return BOT_COLORS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
  }
  return BOT_COLORS[Math.abs(hash) % BOT_COLORS.length];
}

export function formatDueDate(dateStr) {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dateStr + 'T00:00:00');
  const diffMs = due - today;
  const diffDays = Math.round(diffMs / 86400000);

  if (diffDays < 0) {
    return { text: `D+${Math.abs(diffDays)} 초과`, status: 'overdue' };
  }
  if (diffDays === 0) {
    return { text: '오늘 마감', status: 'today' };
  }
  if (diffDays <= 3) {
    return { text: `D-${diffDays}`, status: 'soon' };
  }
  return { text: `D-${diffDays}`, status: 'safe' };
}
