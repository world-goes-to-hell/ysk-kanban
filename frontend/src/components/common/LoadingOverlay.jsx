import { useLoading } from '../../hooks/useLoading';
import styles from '../../styles/utils.module.css';

export default function LoadingOverlay() {
  const { active } = useLoading();

  return (
    <div
      className={`${styles.loadingOverlay} ${active ? styles.active : ''}`}
      aria-hidden={!active}
    >
      <div className={styles.spinner} />
    </div>
  );
}
