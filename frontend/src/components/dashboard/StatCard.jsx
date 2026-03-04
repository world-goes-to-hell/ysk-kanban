import styles from '../../styles/dashboard.module.css';

export default function StatCard({ value, label, colorClass, colorVar }) {
  return (
    <div className={styles.statCard}>
      {colorVar && <div className={styles.statCardAccent} style={{ background: colorVar }} />}
      <div className={styles.statCardBody}>
        <div className={`${styles.statCardValue} ${colorClass || ''}`}>{value}</div>
        <div className={styles.statCardLabel}>{label}</div>
      </div>
    </div>
  );
}
