import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useProjects } from '../../contexts/ProjectContext';
import ProjectModal from '../project/ProjectModal';
import ProjectMembersModal from '../project/ProjectMembersModal';
import ConfirmDialog from '../common/ConfirmDialog';
import SidebarProjectItem from './SidebarProjectItem';
import styles from '../../styles/layout.module.css';

export default function Sidebar({ sidebarOpen, onCloseSidebar }) {
  const { projectTree, favoriteIds, deleteProject, loadProjects } = useProjects();
  const [membersProject, setMembersProject] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const [projectModal, setProjectModal] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [contextMenu, setContextMenu] = useState(null);

  const isDashboard = location.pathname === '/';
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
        <nav className={styles.sidebarTopNav}>
          <button
            className={`${styles.sidebarItem} ${isDashboard ? styles.sidebarItemActive : ''}`}
            onClick={handleDashboardClick}
          >
            <span className={styles.sidebarItemIcon}>&#128202;</span>
            <span className={styles.sidebarItemLabel}>대시보드</span>
          </button>
        </nav>
        <div className={styles.sidebarHeader}>
          <h2 className={styles.sidebarTitle}>프로젝트</h2>
          <button
            className={styles.sidebarAddBtn}
            title="프로젝트 추가"
            onClick={() => setProjectModal({ mode: 'create', project: null })}
          >
            +
          </button>
        </div>
        <div className={styles.sidebarSearchWrap}>
          <input
            className={styles.sidebarSearch}
            type="text"
            placeholder="프로젝트 검색..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <nav className={styles.sidebarNav}>
          {filteredTree.map(p => (
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
          ))}
        </nav>
      </aside>

      {contextMenu && (
        <div
          style={{
            position: 'fixed',
            top: contextMenu.y,
            left: contextMenu.x,
            background: 'var(--color-bg-card, #23262f)',
            border: '1px solid var(--color-border, #35383f)',
            borderRadius: '6px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
            zIndex: 9999,
            minWidth: '160px',
            padding: '4px 0',
          }}
          onClick={e => e.stopPropagation()}
        >
          <button
            style={{
              display: 'block',
              width: '100%',
              padding: '8px 14px',
              background: 'none',
              border: 'none',
              color: 'var(--color-text, #e0e0e0)',
              cursor: 'pointer',
              textAlign: 'left',
              fontSize: '13px',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--color-bg-hover, #2a2d36)'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
            onClick={() => {
              setProjectModal({ mode: 'create', project: null, parentId: contextMenu.project.id });
              setContextMenu(null);
            }}
          >
            + 하위 프로젝트 생성
          </button>
        </div>
      )}

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
