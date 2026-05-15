import { useState, useRef, useEffect } from 'react';
import { formatTime } from '../../utils/formatters';
import {
  isSupported as isBrowserNotifSupported,
  getPermission as getBrowserNotifPermission,
  requestPermission as requestBrowserNotifPermission,
  isEnabled as isBrowserNotifEnabled,
  setEnabled as setBrowserNotifEnabled,
} from '../../utils/browserNotification';
import styles from '../../styles/notification.module.css';

const TYPE_LABELS = {
  ASSIGNED: '배정',
  COMMENT_ADDED: '댓글',
  STATUS_CHANGED: '상태',
  MENTIONED: '멘션',
};

export default function NotificationBell({ notifications, unreadCount, onMarkAsRead, onMarkAllAsRead }) {
  const [open, setOpen] = useState(false);
  const [permission, setPermission] = useState(getBrowserNotifPermission());
  const [osEnabled, setOsEnabled] = useState(isBrowserNotifEnabled());
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleItemClick = (n) => {
    if (!n.isRead) onMarkAsRead(n.id);
  };

  const handleEnableOsNotif = async () => {
    const result = await requestBrowserNotifPermission();
    setPermission(result);
    setOsEnabled(result === 'granted');
  };

  const handleToggleOsNotif = () => {
    const next = !osEnabled;
    setBrowserNotifEnabled(next);
    setOsEnabled(next);
  };

  return (
    <div className={styles.bellWrap} ref={ref}>
      <button className={styles.bellBtn} onClick={() => setOpen(prev => !prev)} title="알림">
        &#128276;
        {unreadCount > 0 && <span className={styles.bellBadge}>{unreadCount > 99 ? '99+' : unreadCount}</span>}
      </button>
      {open && (
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <span className={styles.panelTitle}>알림</span>
            {unreadCount > 0 && (
              <button className={styles.panelReadAll} onClick={onMarkAllAsRead}>모두 읽음</button>
            )}
          </div>
          {isBrowserNotifSupported() && (
            <div className={styles.osNotifRow}>
              <span className={styles.osNotifLabel}>OS 알림</span>
              {permission === 'granted' ? (
                <button
                  className={`${styles.osNotifToggle} ${osEnabled ? styles.osNotifToggleOn : ''}`}
                  onClick={handleToggleOsNotif}
                  title={osEnabled ? '끄기' : '켜기'}
                >
                  {osEnabled ? '켜짐' : '꺼짐'}
                </button>
              ) : permission === 'denied' ? (
                <span className={styles.osNotifDenied} title="브라우저 설정에서 알림 권한을 허용해주세요">차단됨</span>
              ) : (
                <button className={styles.osNotifEnableBtn} onClick={handleEnableOsNotif}>허용</button>
              )}
            </div>
          )}
          <div className={styles.panelBody}>
            {notifications.length === 0 ? (
              <div className={styles.panelEmpty}>알림이 없습니다.</div>
            ) : (
              notifications.slice(0, 50).map(n => (
                <div
                  key={n.id}
                  className={`${styles.notifItem} ${!n.isRead ? styles.notifItemUnread : ''}`}
                  onClick={() => handleItemClick(n)}
                >
                  <span className={`${styles.notifDot} ${n.isRead ? styles.notifDotRead : ''}`} />
                  <div className={styles.notifContent}>
                    <div className={styles.notifMessage}>
                      <span className={`${styles.notifType} ${styles[`notifType${n.type}`]}`}>
                        {TYPE_LABELS[n.type] || n.type}
                      </span>
                      {n.message}
                    </div>
                    <div className={styles.notifTime}>{formatTime(n.createdAt)}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
