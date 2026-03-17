import { useState, useMemo } from 'react';
import styles from '../../styles/assigneeGrid.module.css';

const COLORS = [
  '#4f46e5', '#7c3aed', '#db2777', '#ea580c',
  '#0891b2', '#059669', '#d97706', '#6366f1',
];

function getColor(id) {
  const num = typeof id === 'number' ? id : String(id).split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return COLORS[num % COLORS.length];
}

function getInitials(name) {
  if (!name) return '?';
  const trimmed = name.trim();
  if (trimmed.length <= 2) return trimmed;
  return trimmed.slice(0, 2);
}

export default function AssigneeGrid({ members, selectedIds, onToggle }) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return members;
    const q = search.trim().toLowerCase();
    return members.filter(u => {
      const name = (u.displayName || u.username || '').toLowerCase();
      return name.includes(q);
    });
  }, [members, search]);

  const selectedMembers = useMemo(
    () => members.filter(u => selectedIds.includes(u.id)),
    [members, selectedIds]
  );

  if (!members || members.length === 0) return null;

  return (
    <div className={styles.container}>
      {members.length > 5 && (
        <input
          className={styles.searchInput}
          type="text"
          placeholder="이름 검색..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      )}

      <div className={styles.grid}>
        {filtered.map(user => {
          const name = user.displayName || user.username;
          const isSelected = selectedIds.includes(user.id);
          return (
            <button
              key={user.id}
              type="button"
              className={`${styles.avatarBtn} ${isSelected ? styles.avatarSelected : ''}`}
              onClick={() => onToggle(user.id)}
              title={name}
            >
              <div
                className={styles.avatar}
                style={{ backgroundColor: isSelected ? getColor(user.id) : 'var(--bg-column)' }}
              >
                {isSelected && <span className={styles.checkMark}>✓</span>}
                {!isSelected && (
                  <span style={{ color: getColor(user.id), fontWeight: 700 }}>
                    {getInitials(name)}
                  </span>
                )}
              </div>
              <span className={styles.avatarName}>{name}</span>
            </button>
          );
        })}
        {filtered.length === 0 && (
          <div className={styles.emptyMsg}>일치하는 멤버가 없습니다</div>
        )}
      </div>

      {selectedMembers.length > 0 && (
        <div className={styles.selectedRow}>
          {selectedMembers.map(user => (
            <span key={user.id} className={styles.chip}>
              {user.displayName || user.username}
              <button
                type="button"
                className={styles.chipRemove}
                onClick={() => onToggle(user.id)}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
