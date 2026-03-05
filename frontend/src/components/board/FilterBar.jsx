import { useMemo } from 'react';
import styles from '../../styles/filter.module.css';

const PRIORITY_OPTIONS = [
  { value: '', label: '전체 우선순위' },
  { value: 'HIGHEST', label: '최상' },
  { value: 'HIGH', label: '높음' },
  { value: 'MEDIUM', label: '보통' },
  { value: 'LOW', label: '낮음' },
  { value: 'LOWEST', label: '최하' },
];

export default function FilterBar({ filters, onFilterChange, todos }) {
  const assigneeOptions = useMemo(() => {
    const map = new Map();
    todos.forEach(t => {
      t.assignees?.forEach(a => {
        if (!map.has(a.id)) map.set(a.id, a.displayName || a.username);
      });
    });
    return Array.from(map, ([id, name]) => ({ value: String(id), label: name }));
  }, [todos]);

  const hasFilters = filters.keyword || filters.priority || filters.assigneeId;

  return (
    <div className={styles.filterBar}>
      <input
        className={styles.filterInput}
        type="text"
        placeholder="키워드 검색..."
        value={filters.keyword}
        onChange={e => onFilterChange({ ...filters, keyword: e.target.value })}
      />
      <select
        className={styles.filterSelect}
        value={filters.priority}
        onChange={e => onFilterChange({ ...filters, priority: e.target.value })}
      >
        {PRIORITY_OPTIONS.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {assigneeOptions.length > 0 && (
        <select
          className={styles.filterSelect}
          value={filters.assigneeId}
          onChange={e => onFilterChange({ ...filters, assigneeId: e.target.value })}
        >
          <option value="">전체 담당자</option>
          {assigneeOptions.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      )}
      {hasFilters && (
        <button
          className={styles.filterClear}
          onClick={() => onFilterChange({ keyword: '', priority: '', assigneeId: '' })}
        >
          초기화
        </button>
      )}
    </div>
  );
}
