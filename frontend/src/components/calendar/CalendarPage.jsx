import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProjects } from '../../contexts/ProjectContext';
import { fetchCalendarTodos } from '../../api/calendar';
import DetailModal from '../detail/DetailModal';
import styles from '../../styles/calendar.module.css';

const PROJECT_COLORS = [
  '#2563eb', '#7c3aed', '#db2777', '#ea580c', '#059669',
  '#0891b2', '#4f46e5', '#b91c1c', '#a16207', '#0d9488',
  '#6d28d9', '#c2410c', '#15803d', '#1d4ed8', '#9333ea',
];

export default function CalendarPage() {
  const navigate = useNavigate();
  const { projects } = useProjects();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [detailTodoId, setDetailTodoId] = useState(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const accessibleProjectIds = useMemo(() => new Set(projects.map(p => p.id)), [projects]);

  const projectColorMap = useMemo(() => {
    const map = {};
    projects.forEach((p, i) => {
      map[p.id] = PROJECT_COLORS[i % PROJECT_COLORS.length];
    });
    return map;
  }, [projects]);

  const { startDate, endDate, calendarDays } = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const startOffset = firstDay.getDay();
    const calStart = new Date(year, month, 1 - startOffset);

    const days = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(calStart);
      d.setDate(calStart.getDate() + i);
      days.push(d);
    }

    const sd = calStart.toISOString().split('T')[0];
    const ed = days[41].toISOString().split('T')[0];

    return { startDate: sd, endDate: ed, calendarDays: days };
  }, [year, month]);

  useEffect(() => {
    if (projects.length > 0) {
      loadTodos();
    }
  }, [startDate, endDate, selectedProjectId, projects]);

  const loadTodos = async () => {
    setLoading(true);
    try {
      const pid = selectedProjectId || undefined;
      const data = await fetchCalendarTodos(startDate, endDate, pid);
      const filtered = data
        .filter(t => t.dueDate)
        .filter(t => !t.project || accessibleProjectIds.has(t.project.id));
      setTodos(filtered);
    } catch (e) {
      console.error('캘린더 데이터 로드 실패:', e);
    } finally {
      setLoading(false);
    }
  };

  const usedProjectIds = useMemo(() => {
    const ids = new Set();
    todos.forEach(t => { if (t.project?.id) ids.add(t.project.id); });
    return ids;
  }, [todos]);

  const legendProjects = useMemo(() => {
    return projects.filter(p => usedProjectIds.has(p.id));
  }, [projects, usedProjectIds]);

  const todosByDate = useMemo(() => {
    const map = {};
    todos.forEach(todo => {
      const key = todo.dueDate;
      if (!map[key]) map[key] = [];
      map[key].push(todo);
    });
    return map;
  }, [todos]);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToday = () => setCurrentDate(new Date());

  const today = new Date().toISOString().split('T')[0];

  const getProjectColor = (todo) => {
    if (!todo.project?.id) return 'var(--text-muted)';
    return projectColorMap[todo.project.id] || 'var(--text-muted)';
  };

  const handleTodoClick = (todo) => {
    setDetailTodoId(todo.id);
  };

  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];

  return (
    <div className={styles.calendarPage}>
      <div className={styles.calendarHeader}>
        <h2 className={styles.calendarTitle}>캘린더</h2>
        <div className={styles.calendarControls}>
          <select
            className={styles.projectFilter}
            value={selectedProjectId}
            onChange={e => setSelectedProjectId(e.target.value)}
          >
            <option value="">전체 프로젝트</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <div className={styles.calendarNav}>
            <button className={styles.navBtn} onClick={prevMonth}>&lt;</button>
            <span className={styles.currentMonth}>{year}년 {month + 1}월</span>
            <button className={styles.navBtn} onClick={nextMonth}>&gt;</button>
            <button className={styles.todayBtn} onClick={goToday}>오늘</button>
          </div>
        </div>
      </div>

      <div className={styles.legendBar}>
        <span className={styles.legendLabel}>프로젝트</span>
        {legendProjects.length > 0 ? legendProjects.map(p => (
          <span
            key={p.id}
            className={`${styles.legendItem} ${styles.legendClickable}`}
            onClick={() => navigate(`/projects/${p.id}`)}
            title={`${p.name} 보드로 이동`}
          >
            <span className={styles.legendDot} style={{ background: projectColorMap[p.id] }} />
            {p.name}
          </span>
        )) : (
          <span className={styles.legendItem}>표시할 일감이 없습니다</span>
        )}
      </div>

      <div className={`${styles.calendarGrid} ${loading ? styles.calendarLoading : ''}`}>
        {dayNames.map(day => (
          <div key={day} className={styles.dayHeader}>{day}</div>
        ))}
        {calendarDays.map((date, i) => {
          const dateStr = date.toISOString().split('T')[0];
          const isCurrentMonth = date.getMonth() === month;
          const isToday = dateStr === today;
          const dayTodos = todosByDate[dateStr] || [];
          const isPast = dateStr < today;
          const dayOfWeek = date.getDay();
          const dayCls = [
            styles.dayCell,
            !isCurrentMonth ? styles.otherMonth : '',
            isToday ? styles.today : '',
            dayOfWeek === 0 ? styles.daySunday : '',
            dayOfWeek === 6 ? styles.daySaturday : '',
          ].filter(Boolean).join(' ');

          return (
            <div key={i} className={dayCls}>
              <span className={styles.dayNumber}>{date.getDate()}</span>
              <div className={styles.dayTodos}>
                {dayTodos.slice(0, 3).map(todo => (
                  <div
                    key={todo.id}
                    className={`${styles.todoItem} ${isPast && todo.status !== 'DONE' ? styles.overdue : ''}`}
                    style={{ borderLeftColor: getProjectColor(todo) }}
                    onClick={() => handleTodoClick(todo)}
                    title={`${todo.summary}${todo.project ? ' (' + todo.project.name + ')' : ''}`}
                  >
                    {todo.summary}
                  </div>
                ))}
                {dayTodos.length > 3 && (
                  <div className={styles.moreCount}>+{dayTodos.length - 3}개</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {detailTodoId && (
        <DetailModal
          todoId={detailTodoId}
          todos={todos}
          onClose={() => setDetailTodoId(null)}
        />
      )}
    </div>
  );
}
