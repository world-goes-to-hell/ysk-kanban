import styles from '../../styles/board.module.css';

export default function EmptyState() {
  return (
    <div className={styles.emptyState}>
      <span className={styles.emptyStateIcon} />
      아직 일감이 없습니다
    </div>
  );
}
