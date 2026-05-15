const STORAGE_KEY = 'browserNotificationEnabled';

const TYPE_TITLES = {
  STATUS_CHANGED: '상태 변경',
  ASSIGNED: '담당자 지정',
  COMMENT_ADDED: '새 댓글',
  MENTIONED: '멘션',
};

export function isSupported() {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getPermission() {
  if (!isSupported()) return 'unsupported';
  return Notification.permission;
}

export async function requestPermission() {
  if (!isSupported()) return 'unsupported';
  const result = await Notification.requestPermission();
  if (result === 'granted') {
    localStorage.setItem(STORAGE_KEY, 'true');
  }
  return result;
}

export function isEnabled() {
  if (!isSupported()) return false;
  if (Notification.permission !== 'granted') return false;
  return localStorage.getItem(STORAGE_KEY) !== 'false';
}

export function setEnabled(enabled) {
  localStorage.setItem(STORAGE_KEY, enabled ? 'true' : 'false');
}

let titleFlashTimer = null;
let originalTitle = null;

function captureOriginalTitle() {
  if (originalTitle === null) {
    originalTitle = document.title || '일감 보드';
  }
}

export function startTitleFlash(count) {
  captureOriginalTitle();
  stopTitleFlash();
  if (!count || count <= 0) return;

  let alternate = false;
  titleFlashTimer = setInterval(() => {
    if (document.hasFocus()) {
      stopTitleFlash();
      return;
    }
    document.title = alternate ? originalTitle : `🔔 (${count}) ${originalTitle}`;
    alternate = !alternate;
  }, 1000);
}

export function stopTitleFlash() {
  if (titleFlashTimer) {
    clearInterval(titleFlashTimer);
    titleFlashTimer = null;
  }
  if (originalTitle !== null) {
    document.title = originalTitle;
  }
}

export function showNotification(data, { onClick, forceShow = false } = {}) {
  if (!isEnabled()) return null;
  if (!forceShow && document.visibilityState === 'visible' && document.hasFocus()) {
    return null;
  }
  const title = TYPE_TITLES[data?.type] || '알림';
  const body = data?.message || '';
  try {
    const n = new Notification(title, {
      body,
      icon: '/favicon.svg',
      tag: data?.todoId ? `todo-${data.todoId}` : (data?.id ? `notif-${data.id}` : undefined),
      requireInteraction: false,
      silent: false,
    });
    n.onclick = () => {
      window.focus();
      if (onClick) onClick(data);
      n.close();
    };
    return n;
  } catch (_) {
    return null;
  }
}
