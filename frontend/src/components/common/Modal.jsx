import { useEffect, useRef } from 'react';
import styles from '../../styles/modal.module.css';

export default function Modal({ title, wide, children, footer, onClose, headerRight }) {
  const overlayRef = useRef(null);
  const mouseDownTarget = useRef(null);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const handleMouseDown = (e) => {
    mouseDownTarget.current = e.target;
  };

  const handleClick = (e) => {
    if (e.target === overlayRef.current && mouseDownTarget.current === overlayRef.current) {
      onClose();
    }
    mouseDownTarget.current = null;
  };

  return (
    <div
      className={styles.overlay}
      ref={overlayRef}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      aria-modal="true"
      role="dialog"
    >
      <div className={`${styles.modal} ${wide ? styles.wide : ''}`}>
        <div className={styles.header}>
          <h2 className={styles.title}>{title}</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {headerRight}
            <button className={styles.closeBtn} onClick={onClose} aria-label="닫기">&times;</button>
          </div>
        </div>
        <div className={styles.body}>
          {children}
        </div>
        {footer && (
          <div className={styles.footer}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
