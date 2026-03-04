import styles from '../../styles/dashboard.module.css';

export default function DashboardPanel({ title, headerRight, children }) {
  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <h3 className={styles.panelTitle}>{title}</h3>
        {headerRight && <div className={styles.panelHeaderRight}>{headerRight}</div>}
      </div>
      <div className={styles.panelBody}>{children}</div>
    </div>
  );
}
