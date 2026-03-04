import { useEffect, useState } from 'react';
import { useDashboard } from '../../hooks/useDashboard';
import { useProjects } from '../../contexts/ProjectContext';
import { PRIORITY_LABEL, PRIORITY_COLORS } from '../../utils/constants';
import StatCard from './StatCard';
import ChangeCard from './ChangeCard';
import DashboardPanel from './DashboardPanel';
import DashboardList from './DashboardList';
import BarChart from './BarChart';
import DetailModal from '../detail/DetailModal';
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

export default function DashboardPage() {
  const { data, loadDashboard } = useDashboard();
  const { projects } = useProjects();
  const [detailTodoId, setDetailTodoId] = useState(null);
  const [createdFilter, setCreatedFilter] = useState('');
  const [completedFilter, setCompletedFilter] = useState('');

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
    color: 'var(--brand)',
  }));

  const filteredCreated = filterByProject(data.todayCreated || [], createdFilter);
  const filteredCompleted = filterByProject(data.todayCompleted || [], completedFilter);

  return (
    <div className={styles.dashboard}>
      <h2 className={styles.dashboardTitle}>대시보드</h2>

      <div className={styles.stats}>
        <StatCard value={data.totalProjects} label="전체 프로젝트" colorClass={styles.colorProjects} colorVar="#6366f1" />
        <StatCard value={data.totalTodos} label="전체 일감" colorClass={styles.colorTotal} colorVar="var(--text-primary)" />
        <StatCard value={data.todoCount} label="할 일" colorClass={styles.colorTodo} colorVar="var(--todo-color)" />
        <StatCard value={data.inProgressCount} label="진행 중" colorClass={styles.colorWip} colorVar="var(--wip-color)" />
        <StatCard value={data.doneCount} label="완료" colorClass={styles.colorDone} colorVar="var(--done-color)" />
      </div>

      <div className={styles.changes}>
        <ChangeCard
          header="오늘 등록"
          value={data.todayCreatedCount}
          diff={data.todayCreatedCount - data.yesterdayCreatedCount}
          yesterdayValue={data.yesterdayCreatedCount}
        />
        <ChangeCard
          header="오늘 처리"
          value={data.todayDoneCount}
          diff={data.todayDoneCount - data.yesterdayDoneCount}
          yesterdayValue={data.yesterdayDoneCount}
        />
      </div>

      <div className={styles.grid}>
        <DashboardPanel
          title="오늘 등록된 일감"
          headerRight={<ProjectFilter value={createdFilter} onChange={setCreatedFilter} projects={projects} />}
        >
          <DashboardList
            items={filteredCreated}
            emptyText="오늘 등록된 일감이 없습니다."
            onItemClick={setDetailTodoId}
          />
        </DashboardPanel>
        <DashboardPanel
          title="오늘 처리된 일감"
          headerRight={<ProjectFilter value={completedFilter} onChange={setCompletedFilter} projects={projects} />}
        >
          <DashboardList
            items={filteredCompleted}
            emptyText="오늘 처리된 일감이 없습니다."
            onItemClick={setDetailTodoId}
          />
        </DashboardPanel>
      </div>

      <div className={styles.grid}>
        <DashboardPanel title="우선순위 분포">
          <BarChart items={priorityItems} />
        </DashboardPanel>
        <DashboardPanel title="프로젝트별 일감">
          <BarChart items={projectItems} emptyText="프로젝트가 없습니다." />
        </DashboardPanel>
      </div>

      {detailTodoId && (
        <DetailModal
          todoId={detailTodoId}
          onClose={() => setDetailTodoId(null)}
        />
      )}
    </div>
  );
}
