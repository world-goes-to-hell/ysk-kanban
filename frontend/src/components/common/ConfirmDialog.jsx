import styles from '../../styles/modal.module.css';

export default function ConfirmDialog({ message, onConfirm, onCancel }) {
  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>확인</h2>
        </div>
        <div className={styles.body}>
          <p style={{ fontSize: '0.9rem', lineHeight: 1.6 }}>{message}</p>
        </div>
        <div className={styles.footer}>
          <button className="btn btn-ghost" onClick={onCancel}>취소</button>
          <button className="btn btn-danger" onClick={onConfirm}>확인</button>
        </div>
      </div>
    </div>
  );
}
