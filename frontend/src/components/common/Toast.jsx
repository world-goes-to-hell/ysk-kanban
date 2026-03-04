import styles from '../../styles/toast.module.css';

export default function Toast({ message, type = 'default', leaving }) {
  const cls = [
    styles.toast,
    type === 'error' ? styles.error : '',
    type === 'success' ? styles.success : '',
    leaving ? styles.leaving : '',
  ].filter(Boolean).join(' ');

  return (
    <div className={cls} role="alert">
      {message}
    </div>
  );
}
