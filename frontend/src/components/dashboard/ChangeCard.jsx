import styles from '../../styles/dashboard.module.css';

function DiffBadge({ diff }) {
  if (diff > 0) {
    return <span className={`${styles.changeBadge} ${styles.changeBadgeUp}`}>+{diff} &#9650;</span>;
  }
  if (diff < 0) {
    return <span className={`${styles.changeBadge} ${styles.changeBadgeDown}`}>{diff} &#9660;</span>;
  }
  return <span className={`${styles.changeBadge} ${styles.changeBadgeNeutral}`}>0 &#9644;</span>;
}

export default function ChangeCard({ header, value, diff, yesterdayValue }) {
  return (
    <div className={styles.changeCard}>
      <div className={styles.changeCardHeader}>{header}</div>
      <div className={styles.changeCardRow}>
        <div className={styles.changeCardMain}>
          <div className={styles.changeCardValue}>{value}<span className={styles.changeCardUnit}>건</span></div>
          <div className={styles.changeCardDiff}>
            어제 대비 <DiffBadge diff={diff} />
          </div>
        </div>
        {yesterdayValue !== undefined && (
          <div className={styles.changeCardYesterday}>
            <div className={styles.changeCardYesterdayLabel}>어제</div>
            <div className={styles.changeCardYesterdayValue}>{yesterdayValue}건</div>
          </div>
        )}
      </div>
    </div>
  );
}
