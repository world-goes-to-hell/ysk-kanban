import styles from '../../styles/dashboard.module.css';

export default function BarChart({ items, emptyText }) {
  if (!items || items.length === 0) {
    return <p className={styles.empty}>{emptyText || '데이터가 없습니다.'}</p>;
  }

  const maxVal = Math.max(1, ...items.map(i => i.count));

  return (
    <>
      {items.map((item, idx) => {
        const pct = Math.round((item.count / maxVal) * 100);
        return (
          <div key={idx} className={styles.barRow}>
            <span className={styles.barLabel}>{item.label}</span>
            <div className={styles.barTrack}>
              <div
                className={styles.barFill}
                style={{ width: `${pct}%`, background: item.color || 'var(--brand)' }}
              />
            </div>
            <span className={styles.barCount}>{item.count}</span>
          </div>
        );
      })}
    </>
  );
}
