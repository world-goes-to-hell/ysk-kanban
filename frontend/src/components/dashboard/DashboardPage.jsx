import { useEffect, useState, useMemo, useCallback } from 'react';
import { useDashboard } from '../../hooks/useDashboard';
import { useProjects } from '../../contexts/ProjectContext';
import { useToast } from '../../hooks/useToast';
import { PRIORITY_LABEL, PRIORITY_COLORS } from '../../utils/constants';
import DashboardPanel from './DashboardPanel';
import DashboardList from './DashboardList';
import BarChart from './BarChart';
import DetailModal from '../detail/DetailModal';
import DailyReportModal from '../report/DailyReportModal';
import styles from '../../styles/dashboard.module.css';

function ProjectFilter({ value, onChange, projects }) {
  return (
    <select
      className={styles.panelFilter}
      value={value}
      onChange={e => onChange(e.target.value)}
    >
      <option value="">전체</option>
      {projects.map(p => (
        <option key={p.id} value={p.id}>
          {p.name || p.projectKey}
        </option>
      ))}
    </select>
  );
}

function filterByProject(items, projectId) {
  if (!projectId) return items;
  return items.filter(item => String(item.project?.id) === String(projectId));
}

function MiniStat({ label, value, delta, deltaClass }) {
  return (
    <div className={styles.miniStat}>
      <span>{label}</span>
      <strong>{value}</strong>
      {delta && <em className={deltaClass}>{delta}</em>}
    </div>
  );
}

function MetricCard({ chip, value, desc }) {
  return (
    <article className={`${styles.card} ${styles.metricCard}`}>
      <span className={styles.metricCardChip}>{chip}</span>
      <strong className={styles.metricCardValue}>{value}</strong>
      <p className={styles.metricCardDesc}>{desc}</p>
    </article>
  );
}

export default function DashboardPage() {
  const { data, loadDashboard } = useDashboard();
  const { projects } = useProjects();
  const showToast = useToast();
  const [detailTodoId, setDetailTodoId] = useState(null);
  const accessibleProjectIds = useMemo(() => new Set(projects.map(p => p.id)), [projects]);

  const handleItemClick = useCallback((todoId, projectId) => {
    if (projectId && !accessibleProjectIds.has(projectId)) {
      showToast('해당 프로젝트에 접근 권한이 없습니다.', 'error');
      return;
    }
    setDetailTodoId(todoId);
  }, [accessibleProjectIds, showToast]);
  const [createdFilter, setCreatedFilter] = useState('');
  const [completedFilter, setCompletedFilter] = useState('');
  const [showDailyReport, setShowDailyReport] = useState(false);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  if (!data) return null;

  const priorityItems = Object.entries(PRIORITY_LABEL).map(([key, label]) => ({
    label,
    count: data.priorityDistribution?.[key] || 0,
    color: PRIORITY_COLORS[key],
  }));

  const projectItems = (data.projectDistribution || []).map(p => ({
    label: p.projectName,
    count: p.count,
    color: 'var(--accent-indigo)',
  }));

  const accessibleCreated = (data.todayCreated || []).filter(t => !t.project || accessibleProjectIds.has(t.project.id));
  const accessibleCompleted = (data.todayCompleted || []).filter(t => !t.project || accessibleProjectIds.has(t.project.id));
  const filteredCreated = filterByProject(accessibleCreated, createdFilter);
  const filteredCompleted = filterByProject(accessibleCompleted, completedFilter);

  const createdProjects = projects.filter(p => accessibleCreated.some(t => t.project?.id === p.id));
  const completedProjects = projects.filter(p => accessibleCompleted.some(t => t.project?.id === p.id));

  // 파생 지표
  const total = data.totalTodos || 0;
  const donePct = total > 0 ? Math.round((data.doneCount / total) * 100) : 0;
  const wipPct = total > 0 ? Math.round((data.inProgressCount / total) * 100) : 0;
  const ringWip = donePct + wipPct;
  const createdDelta = (data.todayCreatedCount || 0) - (data.yesterdayCreatedCount || 0);
  const doneDelta = (data.todayDoneCount || 0) - (data.yesterdayDoneCount || 0);
  const createdDeltaText = `${createdDelta >= 0 ? '+' : ''}${createdDelta} 전일 대비`;
  const doneDeltaText = `${doneDelta >= 0 ? '+' : ''}${doneDelta} 전일 대비`;
  const highPriorityCount =
    (data.priorityDistribution?.HIGHEST || 0) +
    (data.priorityDistribution?.HIGH || 0);

  return (
    <div className={styles.dashboard}>
      {/* Topbar */}
      <div className={styles.topbar}>
        <div className={styles.headline}>
          <h2>업무 운영 대시보드</h2>
          <p>오늘 등록·처리된 일감, 우선순위 분포, 프로젝트 현황을 한눈에 확인합니다.</p>
        </div>
        <div className={styles.topActions}>
          <button
            type="button"
            className={styles.reportBtn}
            onClick={() => setShowDailyReport(true)}
          >
            업무보고 출력
          </button>
        </div>
      </div>

      {/* Hero */}
      <section className={styles.hero}>
        <article className={`${styles.card} ${styles.heroMain}`}>
          <div className={styles.chipRow}>
            <div className={styles.chip}>실시간 현황</div>
            <div className={styles.chip}>오늘 기준</div>
            <div className={styles.chip}>{data.totalProjects}개 프로젝트</div>
          </div>
          <h3 className={styles.heroHeadline}>일감 상태·우선순위·진척을 한눈에</h3>
          <p className={styles.heroSubtext}>
            전체 {total}개 일감 중 {data.doneCount}개가 완료 상태입니다.
            진행 중인 {data.inProgressCount}건과 대기 {data.todoCount}건의 흐름을 확인하세요.
          </p>
          <div className={styles.heroStats}>
            <MiniStat
              label="전체 일감"
              value={total}
              delta={createdDeltaText}
              deltaClass={createdDelta > 0 ? styles.miniStatUp : createdDelta < 0 ? styles.miniStatDown : styles.miniStatNeutral}
            />
            <MiniStat
              label="완료율"
              value={`${donePct}%`}
              delta={`${data.doneCount} / ${total}`}
              deltaClass={styles.miniStatUp}
            />
            <MiniStat
              label="진행 중"
              value={data.inProgressCount}
              delta={`${wipPct}% 비중`}
              deltaClass={styles.miniStatNeutral}
            />
          </div>
        </article>

        <aside className={`${styles.card} ${styles.heroSide}`}>
          <div className={styles.sectionHead}>
            <h4>업무 분포</h4>
          </div>
          <div
            className={styles.ringBox}
            style={{ '--ring-done': `${donePct}%`, '--ring-wip': `${ringWip}%` }}
          >
            <div className={styles.ring}><strong>{donePct}%</strong></div>
            <div className={styles.legend}>
              <div className={styles.legendItem}>
                <div className="left" style={{ display: 'flex', alignItems: 'center', gap: 9, color: 'var(--text-primary)', fontWeight: 600 }}>
                  <span className={styles.legendDot} style={{ background: '#4f46e5' }} />완료
                </div>
                <strong>{data.doneCount}건</strong>
              </div>
              <div className={styles.legendItem}>
                <div className="left" style={{ display: 'flex', alignItems: 'center', gap: 9, color: 'var(--text-primary)', fontWeight: 600 }}>
                  <span className={styles.legendDot} style={{ background: '#93c5fd' }} />진행 중
                </div>
                <strong>{data.inProgressCount}건</strong>
              </div>
              <div className={styles.legendItem}>
                <div className="left" style={{ display: 'flex', alignItems: 'center', gap: 9, color: 'var(--text-primary)', fontWeight: 600 }}>
                  <span className={styles.legendDot} style={{ background: '#e5e7eb' }} />할 일
                </div>
                <strong>{data.todoCount}건</strong>
              </div>
            </div>
          </div>
          <div className={styles.heroAlert}>
            <div className={styles.heroAlertLabel}>오늘의 요약</div>
            <strong className={styles.heroAlertTitle}>
              등록 {data.todayCreatedCount}건 · 처리 {data.todayDoneCount}건
            </strong>
            <div className={styles.heroAlertText}>
              {doneDelta >= 0
                ? `처리 속도가 어제보다 ${Math.abs(doneDelta)}건 ${doneDelta === 0 ? '동일' : '많아'}졌습니다.`
                : `처리 속도가 어제보다 ${Math.abs(doneDelta)}건 줄었습니다.`}
            </div>
          </div>
        </aside>
      </section>

      {/* Content Grid */}
      <section className={styles.contentGrid}>
        <article className={`${styles.card} ${styles.panel}`}>
          <div className={styles.panelHeader}>
            <h3 className={styles.panelTitle}>우선순위 분포</h3>
          </div>
          <div className={styles.panelBody} style={{ maxHeight: 'none' }}>
            <BarChart items={priorityItems} />
          </div>
          <div className={styles.panelHeader}>
            <h3 className={styles.panelTitle}>프로젝트별 일감</h3>
          </div>
          <div className={styles.panelBody}>
            <BarChart items={projectItems} emptyText="프로젝트가 없습니다." />
          </div>
        </article>

        <aside className={`${styles.card} ${styles.panel}`}>
          <div className={styles.panelHeader}>
            <h3 className={styles.panelTitle}>오늘 등록된 일감</h3>
            <ProjectFilter
              value={createdFilter}
              onChange={setCreatedFilter}
              projects={createdProjects}
            />
          </div>
          <div className={styles.panelBody}>
            <DashboardList
              items={filteredCreated}
              emptyText="오늘 등록된 일감이 없습니다."
              onItemClick={handleItemClick}
            />
          </div>
          <div className={styles.panelHeader}>
            <h3 className={styles.panelTitle}>오늘 처리된 일감</h3>
            <ProjectFilter
              value={completedFilter}
              onChange={setCompletedFilter}
              projects={completedProjects}
            />
          </div>
          <div className={styles.panelBody}>
            <DashboardList
              items={filteredCompleted}
              emptyText="오늘 처리된 일감이 없습니다."
              onItemClick={handleItemClick}
            />
          </div>
        </aside>
      </section>

      {/* Bottom Grid: 3 metric cards */}
      <section className={styles.bottomGrid}>
        <MetricCard
          chip="생산성"
          value={`${donePct}%`}
          desc={`전체 일감의 ${donePct}%가 완료 상태입니다. 총 ${data.doneCount}건 처리.`}
        />
        <MetricCard
          chip="오늘 등록"
          value={`${data.todayCreatedCount}건`}
          desc={`${createdDeltaText}. 어제는 ${data.yesterdayCreatedCount || 0}건이 새로 등록되었습니다.`}
        />
        <MetricCard
          chip="리스크"
          value={`${highPriorityCount}건`}
          desc="높음 이상 우선순위 일감. 마감/담당자 미배정 항목을 우선 점검하세요."
        />
      </section>

      <div className={styles.floatingNote}>
        <span className={styles.floatingNotePulse} />
        실시간 동기화 중 · 새로고침 없이 업데이트
      </div>

      {detailTodoId && (
        <DetailModal
          todoId={detailTodoId}
          onClose={() => setDetailTodoId(null)}
        />
      )}

      {showDailyReport && (
        <DailyReportModal onClose={() => setShowDailyReport(false)} />
      )}
    </div>
  );
}
