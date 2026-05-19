import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useProjects } from '../../contexts/ProjectContext';
import ProjectModal from '../project/ProjectModal';
import ProjectMembersModal from '../project/ProjectMembersModal';
import ConfirmDialog from '../common/ConfirmDialog';
import SidebarProjectItem from './SidebarProjectItem';
import styles from '../../styles/layout.module.css';

export default function Sidebar({ sidebarOpen, onCloseSidebar }) {
  const { projectTree, favoriteIds, deleteProject, loadProjects, myRoles } = useProjects();
  const { currentUser } = useAuth();
  const [membersProject, setMembersProject] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const [projectModal, setProjectModal] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [contextMenu, setContextMenu] = useState(null);

  const isDashboard = location.pathname === '/';
  const isReport = location.pathname === '/report';
  const isCalendar = location.pathname === '/calendar';
  const isAdminMembers = location.pathname === '/admin/members';
  const isAdmin = currentUser?.username === 'admin';
  const activeProjectId = location.pathname.match(/^\/projects\/(\d+)/)?.[1];

  // Sort project tree: favorites first, then filter by search
  const filteredTree = useMemo(() => {
    const sorted = [...projectTree].sort((a, b) => {
      const aFav = favoriteIds.has(a.id) ? 0 : 1;
      const bFav = favoriteIds.has(b.id) ? 0 : 1;
      return aFav - bFav;
    });
    if (!searchQuery.trim()) return sorted;
    const q = searchQuery.trim().toLowerCase();
    const filterNode = (node) => {
      const nameMatch = (node.name || '').toLowerCase().includes(q) || (node.projectKey || '').toLowerCase().includes(q);
      const filteredChildren = (node.children || []).map(filterNode).filter(Boolean);
      if (nameMatch || filteredChildren.length > 0) {
        return { ...node, children: filteredChildren };
      }
      return null;
    };
    return sorted.map(filterNode).filter(Boolean);
  }, [projectTree, searchQuery, favoriteIds]);

  const handleDashboardClick = () => {
    navigate('/');
    onCloseSidebar?.();
  };

  const handleProjectClick = (projectId) => {
    navigate(`/projects/${projectId}`);
    onCloseSidebar?.();
  };

  const handleCreateChild = useCallback((e, project) => {
    setContextMenu({ x: e.clientX, y: e.clientY, project });
  }, []);

  useEffect(() => {
    if (!contextMenu) return;
    const handleClick = () => setContextMenu(null);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [contextMenu]);

  const handleEditProject = (e, project) => {
    e.stopPropagation();
    setProjectModal({ mode: 'edit', project });
  };

  const handleDeleteProject = (e, project) => {
    e.stopPropagation();
    setConfirmDelete(project);
  };

  const confirmDeleteProject = async () => {
    if (!confirmDelete) return;
    const id = confirmDelete.id;
    setConfirmDelete(null);
    try {
      await deleteProject(id);
      if (activeProjectId === String(id)) {
        navigate('/');
      }
    } catch (_) {}
  };

  return (
    <>
      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.sidebarBrand}>
          <div className={styles.sidebarBrandBadge}>✓</div>
          <div className={styles.sidebarBrandText}>
            <h1>YSK Kanban</h1>
            <p>일감 관리 플랫폼</p>
          </div>
        </div>

        <nav className={styles.sidebarTopNav}>
          <button
            type="button"
            className={`${styles.sidebarMenuItem} ${isDashboard ? styles.sidebarMenuItemActive : ''}`}
            onClick={handleDashboardClick}
          >
            <div className={styles.sidebarMenuLeft}>
              <div className={styles.sidebarMenuIcon}>📊</div>
              <div className={styles.sidebarMenuText}>
                <strong>대시보드</strong>
                <span>요약 지표와 현황</span>
              </div>
            </div>
          </button>
          <button
            type="button"
            className={`${styles.sidebarMenuItem} ${isReport ? styles.sidebarMenuItemActive : ''}`}
            onClick={() => { navigate('/report'); onCloseSidebar?.(); }}
          >
            <div className={styles.sidebarMenuLeft}>
              <div className={styles.sidebarMenuIcon}>📋</div>
              <div className={styles.sidebarMenuText}>
                <strong>작업내역</strong>
                <span>완료 이력 리포트</span>
              </div>
            </div>
          </button>
          <button
            type="button"
            className={`${styles.sidebarMenuItem} ${isCalendar ? styles.sidebarMenuItemActive : ''}`}
            onClick={() => { navigate('/calendar'); onCloseSidebar?.(); }}
          >
            <div className={styles.sidebarMenuLeft}>
              <div className={styles.sidebarMenuIcon}>📅</div>
              <div className={styles.sidebarMenuText}>
                <strong>캘린더</strong>
                <span>마감 일정 확인</span>
              </div>
            </div>
          </button>
          {isAdmin && (
            <button
              type="button"
              className={`${styles.sidebarMenuItem} ${isAdminMembers ? styles.sidebarMenuItemActive : ''}`}
              onClick={() => { navigate('/admin/members'); onCloseSidebar?.(); }}
            >
              <div className={styles.sidebarMenuLeft}>
                <div className={styles.sidebarMenuIcon}>&#128101;</div>
                <div className={styles.sidebarMenuText}>
                  <strong>회원관리</strong>
                  <span>admin 전용 관리</span>
                </div>
              </div>
            </button>
          )}
        </nav>
        <div className={styles.sidebarSearchWrap}>
          <span className={styles.sidebarSearchIcon}>⌕</span>
          <input
            className={styles.sidebarSearch}
            type="text"
            placeholder="프로젝트 검색..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <nav className={styles.sidebarNav}>
          {filteredTree.length > 0 ? (
            filteredTree.map(p => (
              <SidebarProjectItem
                key={p.id}
                project={p}
                activeProjectId={activeProjectId}
                onProjectClick={handleProjectClick}
                onEditProject={handleEditProject}
                onDeleteProject={handleDeleteProject}
                onCreateChild={handleCreateChild}
                onManageMembers={setMembersProject}
              />
            ))
          ) : (
            <div className={styles.sidebarEmpty}>
              {searchQuery.trim() ? '검색 결과가 없습니다.' : '프로젝트가 없습니다.'}
            </div>
          )}
        </nav>

        <div className={styles.sidebarFooterCard}>
          <strong>빠른 액션</strong>
          <p>새 프로젝트를 만들거나 일감을 빠르게 등록해보세요.</p>
          <button
            type="button"
            className={styles.sidebarFooterBtn}
            onClick={() => setProjectModal({ mode: 'create', project: null })}
          >+ 새 프로젝트</button>
        </div>
      </aside>

      {contextMenu && (() => {
        const targetProject = contextMenu.project;
        const targetIsMaster = myRoles?.[targetProject.id] === 'MASTER';
        return (
          <div
            className={styles.sidebarContextMenu}
            style={{ top: contextMenu.y, left: contextMenu.x }}
            onClick={e => e.stopPropagation()}
          >
            <button
              className={styles.sidebarContextMenuItem}
              onClick={() => {
                setProjectModal({ mode: 'create', project: null, parentId: targetProject.id });
                setContextMenu(null);
              }}
            >
              <span className={styles.sidebarContextMenuIcon}>+</span> 하위 프로젝트 생성
            </button>
            {targetIsMaster && (
              <>
                <div className={styles.sidebarContextMenuDivider} />
                <button
                  className={styles.sidebarContextMenuItem}
                  onClick={() => {
                    setMembersProject(targetProject);
                    setContextMenu(null);
                  }}
                >
                  <span className={styles.sidebarContextMenuIcon}>&#128101;</span> 멤버 관리
                </button>
                <button
                  className={styles.sidebarContextMenuItem}
                  onClick={() => {
                    setProjectModal({ mode: 'edit', project: targetProject });
                    setContextMenu(null);
                  }}
                >
                  <span className={styles.sidebarContextMenuIcon}>&#9998;</span> 프로젝트 편집
                </button>
                <button
                  className={`${styles.sidebarContextMenuItem} ${styles.sidebarContextMenuItemDanger}`}
                  onClick={() => {
                    setConfirmDelete(targetProject);
                    setContextMenu(null);
                  }}
                >
                  <span className={styles.sidebarContextMenuIcon}>&times;</span> 프로젝트 삭제
                </button>
              </>
            )}
          </div>
        );
      })()}

      {projectModal && (
        <ProjectModal
          mode={projectModal.mode}
          project={projectModal.project}
          parentId={projectModal.parentId}
          onClose={() => setProjectModal(null)}
        />
      )}

      {membersProject && (
        <ProjectMembersModal
          project={membersProject}
          onClose={() => setMembersProject(null)}
          onUpdated={loadProjects}
        />
      )}

      {confirmDelete && (
        <ConfirmDialog
          message={`프로젝트 "${confirmDelete.name || confirmDelete.projectKey}"을(를) 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`}
          onConfirm={confirmDeleteProject}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </>
  );
}
