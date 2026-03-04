import { useEffect, useRef } from 'react';
import { STATUS_TRANSITIONS } from '../../utils/constants';
import styles from '../../styles/board.module.css';

export default function TransitionDropdown({ currentStatus, anchorRect, onSelect, onClose }) {
  const ref = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        onClose();
      }
    };
    setTimeout(() => document.addEventListener('click', handleClick, true), 0);
    return () => document.removeEventListener('click', handleClick, true);
  }, [onClose]);

  useEffect(() => {
    if (!ref.current || !anchorRect) return;
    const dd = ref.current;
    dd.style.top = `${anchorRect.bottom + 4}px`;
    dd.style.left = `${anchorRect.left}px`;

    requestAnimationFrame(() => {
      const ddRect = dd.getBoundingClientRect();
      if (ddRect.right > window.innerWidth - 8) {
        dd.style.left = `${window.innerWidth - ddRect.width - 8}px`;
      }
    });
  }, [anchorRect]);

  const transitions = STATUS_TRANSITIONS[currentStatus] || [];

  return (
    <div className={styles.transitionDropdown} ref={ref}>
      <ul className={styles.transitionList}>
        {transitions.length === 0 ? (
          <li style={{ padding: '10px 16px', fontSize: '.8rem', color: 'var(--text-muted)' }}>
            이동 가능한 상태가 없습니다
          </li>
        ) : (
          transitions.map(t => (
            <li key={t.status}>
              <button
                className={styles.transitionItem}
                type="button"
                onClick={() => onSelect(t.status, t.label)}
              >
                {t.label}
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
