import { useState, useEffect, useCallback, useMemo } from 'react';
import { useProjects } from '../../contexts/ProjectContext';
import { apiFetch } from '../../api/client';
import todoAPI from '../../api/todos';
import { formatStatus, getPriorityLabel } from '../../utils/formatters';
import CopyableId from '../common/CopyableId';
import styles from '../../styles/report.module.css';

function formatDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

function getRootProjectName(project) {
  if (!project) return '-';
  let current = project;
  while (current.parent) {
    current = current.parent;
  }
  return current.name;
}

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

export default function ReportPage() {
  const { projectTree, projects } = useProjects();
  const accessibleProjectIds = useMemo(() => new Set(projects.map(p => p.id)), [projects]);
  const [users, setUsers] = useState([]);
  const [results, setResults] = useState(null);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
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

  const handleSearch = useCallback(async (page = 0) => {
    setLoading(true);
    try {
      const data = await todoAPI.report(filters, { page, size: pageSize });
      const content = (data.content || [])
        .filter(t => !t.project || accessibleProjectIds.has(t.project.id));
      setResults(content);
      setTotalElements(data.totalElements || 0);
      setTotalPages(data.totalPages || 0);
      setCurrentPage(data.page || 0);
    } catch {
      setResults([]);
      setTotalElements(0);
      setTotalPages(0);
    } finally {
      setLoading(false);
    }
  }, [filters, pageSize, accessibleProjectIds]);

  useEffect(() => {
    handleSearch();
  }, []);

  const handlePageChange = (page) => {
    handleSearch(page);
  };

  const handlePageSizeChange = (newSize) => {
    setPageSize(newSize);
    setCurrentPage(0);
  };

  useEffect(() => {
    if (results !== null) {
      handleSearch(0);
    }
  }, [pageSize]);

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

  const handleExportCsv = async () => {
    if (!results || totalElements === 0) return;

    try {
      const allData = await todoAPI.report(filters, { page: 0, size: totalElements });
      const allResults = (allData.content || [])
        .filter(t => !t.project || accessibleProjectIds.has(t.project.id));

      const bom = '\uFEFF';
      const esc = (v) => `"${String(v ?? '-').replace(/"/g, '""')}"`;
      const header = ['ID', '제목', '상태', '우선순위', '프로젝트', '담당자', '작성자', '등록일', '완료일'];
      const rows = allResults.map(t => [
        t.id,
        esc(t.summary),
        esc(formatStatus(t.status)),
        esc(getPriorityLabel(t.priority)),
        esc(getRootProjectName(t.project)),
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
    } catch {
      // ignore
    }
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const maxVisible = 5;
    let startPage = Math.max(0, currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible);
    if (endPage - startPage < maxVisible) {
      startPage = Math.max(0, endPage - maxVisible);
    }

    const pages = [];
    for (let i = startPage; i < endPage; i++) {
      pages.push(i);
    }

    return (
      <div className={styles.pagination}>
        <button
          className={styles.pageBtn}
          onClick={() => handlePageChange(0)}
          disabled={currentPage === 0}
        >
          &laquo;
        </button>
        <button
          className={styles.pageBtn}
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 0}
        >
          &lt;
        </button>
        {startPage > 0 && <span className={styles.pageEllipsis}>...</span>}
        {pages.map(p => (
          <button
            key={p}
            className={`${styles.pageBtn} ${p === currentPage ? styles.pageBtnActive : ''}`}
            onClick={() => handlePageChange(p)}
          >
            {p + 1}
          </button>
        ))}
        {endPage < totalPages && <span className={styles.pageEllipsis}>...</span>}
        <button
          className={styles.pageBtn}
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage >= totalPages - 1}
        >
          &gt;
        </button>
        <button
          className={styles.pageBtn}
          onClick={() => handlePageChange(totalPages - 1)}
          disabled={currentPage >= totalPages - 1}
        >
          &raquo;
        </button>
      </div>
    );
  };

  const rangeStart = currentPage * pageSize + 1;
  const rangeEnd = Math.min((currentPage + 1) * pageSize, totalElements);

  return (
    <div className={styles.report}>
      <h1 className={styles.reportTitle}>작업내역 조회</h1>

      {/* 필터 영역 */}
      <div className={styles.filterBar}>
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>기간</label>
          <div className={styles.dateRange}>
            <select
              className={styles.filterSelect}
              onChange={e => {
                const days = Number(e.target.value);
                if (isNaN(days)) return;
                const end = new Date();
                const start = new Date();
                start.setDate(start.getDate() - days);
                setFilters(prev => ({ ...prev, startDate: toIso(start), endDate: toIso(end) }));
              }}
              defaultValue=""
            >
              <option value="" disabled>빠른 선택</option>
              <option value="0">오늘</option>
              <option value="1">1일</option>
              <option value="3">3일</option>
              <option value="7">7일</option>
              <option value="15">15일</option>
              <option value="30">1개월</option>
              <option value="90">3개월</option>
            </select>
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
          <button className={styles.searchBtn} onClick={() => handleSearch(0)} disabled={loading}>
            {loading ? '검색중...' : '검색'}
          </button>
          <button
            className={styles.exportBtn}
            onClick={handleExportCsv}
            disabled={totalElements === 0}
          >
            CSV 다운로드
          </button>
        </div>
      </div>

      {/* 결과 */}
      {results !== null && (
        <div className={styles.resultArea}>
          <div className={styles.resultHeader}>
            <span className={styles.resultCount}>
              {totalElements > 0
                ? `총 ${totalElements}건 중 ${rangeStart}-${rangeEnd}`
                : '총 0건'}
            </span>
            <div className={styles.pageSizeWrap}>
              <label className={styles.pageSizeLabel}>표시 건수</label>
              <select
                className={styles.pageSizeSelect}
                value={pageSize}
                onChange={e => handlePageSizeChange(Number(e.target.value))}
              >
                {PAGE_SIZE_OPTIONS.map(opt => (
                  <option key={opt} value={opt}>{opt}건</option>
                ))}
              </select>
            </div>
          </div>

          {results.length === 0 ? (
            <div className={styles.emptyResult}>조건에 맞는 일감이 없습니다.</div>
          ) : (
            <>
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
                        <td className={styles.cellId}><CopyableId id={t.id} className={styles.cellId} /></td>
                        <td className={styles.cellTitle}>{t.summary}</td>
                        <td><span className={`${styles.statusBadge} ${styles[`status_${t.status}`]}`}>{formatStatus(t.status)}</span></td>
                        <td>{getPriorityLabel(t.priority)}</td>
                        <td>{getRootProjectName(t.project)}</td>
                        <td>{t.assignees?.map(a => a.displayName || a.username).join(', ') || '-'}</td>
                        <td>{t.createdBy?.displayName || t.createdBy?.username || '-'}</td>
                        <td className={styles.cellDate}>{formatDate(t.createdAt)}</td>
                        <td className={styles.cellDate}>{formatDate(t.completedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {renderPagination()}
            </>
          )}
        </div>
      )}
    </div>
  );
}
