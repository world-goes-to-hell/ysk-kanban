import { useState, useEffect, useCallback } from 'react';
import { useProjects } from '../../contexts/ProjectContext';
import { apiFetch } from '../../api/client';
import todoAPI from '../../api/todos';
import { formatStatus, getPriorityLabel } from '../../utils/formatters';
import styles from '../../styles/report.module.css';

function formatDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

export default function ReportPage() {
  const { projectTree } = useProjects();
  const [users, setUsers] = useState([]);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  const today = new Date();
  const monthAgo = new Date(today);
  monthAgo.setMonth(monthAgo.getMonth() - 1);
  const toIso = (d) => d.toISOString().split('T')[0];

  const [filters, setFilters] = useState({
    startDate: toIso(monthAgo),
    endDate: toIso(today),
    assigneeId: '',
    createdById: '',
    projectId: '',
    status: '',
  });

  useEffect(() => {
    apiFetch('/api/users').then(setUsers).catch(() => {});
  }, []);

  const handleSearch = useCallback(async () => {
    setLoading(true);
    try {
      const data = await todoAPI.report(filters);
      setResults(data);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    handleSearch();
  }, []);

  const updateFilter = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const flatProjects = (nodes, depth = 0) => {
    const result = [];
    for (const n of nodes) {
      result.push({ id: n.id, name: n.name, depth });
      if (n.children?.length) {
        result.push(...flatProjects(n.children, depth + 1));
      }
    }
    return result;
  };
  const projectOptions = flatProjects(projectTree);

  const handleExportCsv = () => {
    if (!results || results.length === 0) return;

    const bom = '\uFEFF';
    const esc = (v) => `"${String(v ?? '-').replace(/"/g, '""')}"`;
    const header = ['ID', '제목', '상태', '우선순위', '프로젝트', '담당자', '작성자', '등록일', '완료일'];
    const rows = results.map(t => [
      t.id,
      esc(t.summary),
      esc(formatStatus(t.status)),
      esc(getPriorityLabel(t.priority)),
      esc(t.project?.name),
      esc(t.assignees?.map(a => a.displayName || a.username).join(', ')),
      esc(t.createdBy?.displayName || t.createdBy?.username),
      esc(formatDate(t.createdAt)),
      esc(formatDate(t.completedAt)),
    ]);

    const csv = bom + [header.map(esc).join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `작업내역_${filters.startDate}_${filters.endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={styles.report}>
      <h1 className={styles.reportTitle}>작업내역 조회</h1>

      {/* 필터 영역 */}
      <div className={styles.filterBar}>
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>기간</label>
          <div className={styles.dateRange}>
            <input
              type="date"
              className={styles.filterInput}
              value={filters.startDate}
              onChange={e => updateFilter('startDate', e.target.value)}
            />
            <span className={styles.dateSep}>~</span>
            <input
              type="date"
              className={styles.filterInput}
              value={filters.endDate}
              onChange={e => updateFilter('endDate', e.target.value)}
            />
          </div>
        </div>

        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>담당자</label>
          <select
            className={styles.filterSelect}
            value={filters.assigneeId}
            onChange={e => updateFilter('assigneeId', e.target.value)}
          >
            <option value="">전체</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>{u.displayName || u.username}</option>
            ))}
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>작성자</label>
          <select
            className={styles.filterSelect}
            value={filters.createdById}
            onChange={e => updateFilter('createdById', e.target.value)}
          >
            <option value="">전체</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>{u.displayName || u.username}</option>
            ))}
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>프로젝트</label>
          <select
            className={styles.filterSelect}
            value={filters.projectId}
            onChange={e => updateFilter('projectId', e.target.value)}
          >
            <option value="">전체</option>
            {projectOptions.map(p => (
              <option key={p.id} value={p.id}>
                {'  '.repeat(p.depth)}{p.name}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>상태</label>
          <select
            className={styles.filterSelect}
            value={filters.status}
            onChange={e => updateFilter('status', e.target.value)}
          >
            <option value="">전체</option>
            <option value="TODO">할 일</option>
            <option value="IN_PROGRESS">진행중</option>
            <option value="DONE">완료</option>
          </select>
        </div>

        <div className={styles.filterActions}>
          <button className={styles.searchBtn} onClick={handleSearch} disabled={loading}>
            {loading ? '검색중...' : '검색'}
          </button>
          <button
            className={styles.exportBtn}
            onClick={handleExportCsv}
            disabled={!results || results.length === 0}
          >
            CSV 다운로드
          </button>
        </div>
      </div>

      {/* 결과 */}
      {results !== null && (
        <div className={styles.resultArea}>
          <div className={styles.resultHeader}>
            <span className={styles.resultCount}>총 {results.length}건</span>
          </div>

          {results.length === 0 ? (
            <div className={styles.emptyResult}>조건에 맞는 일감이 없습니다.</div>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>제목</th>
                    <th>상태</th>
                    <th>우선순위</th>
                    <th>프로젝트</th>
                    <th>담당자</th>
                    <th>작성자</th>
                    <th>등록일</th>
                    <th>완료일</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map(t => (
                    <tr key={t.id}>
                      <td className={styles.cellId}>#{t.id}</td>
                      <td className={styles.cellTitle}>{t.summary}</td>
                      <td><span className={`${styles.statusBadge} ${styles[`status_${t.status}`]}`}>{formatStatus(t.status)}</span></td>
                      <td>{getPriorityLabel(t.priority)}</td>
                      <td>{t.project?.name || '-'}</td>
                      <td>{t.assignees?.map(a => a.displayName || a.username).join(', ') || '-'}</td>
                      <td>{t.createdBy?.displayName || t.createdBy?.username || '-'}</td>
                      <td className={styles.cellDate}>{formatDate(t.createdAt)}</td>
                      <td className={styles.cellDate}>{formatDate(t.completedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
