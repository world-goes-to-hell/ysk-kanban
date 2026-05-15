import { useState } from 'react';
import { useProjects } from '../../contexts/ProjectContext';
import styles from '../../styles/layout.module.css';

export default function SidebarProjectItem({ project, activeProjectId, depth = 0, onProjectClick, onEditProject, onDeleteProject, onCreateChild, onManageMembers }) {
  const [expanded, setExpanded] = useState(true);
  const { favoriteIds, toggleFavorite, myRoles } = useProjects();
  const hasChildren = project.children && project.children.length > 0;
  const isActive = activeProjectId === String(project.id);
  const isFavorite = favoriteIds.has(project.id);
  const isMaster = myRoles[project.id] === 'MASTER';
  const accessible = project.accessible !== false;

  const handleToggle = (e) => {
    e.stopPropagation();
    setExpanded(prev => !prev);
  };

  const handleFavoriteClick = (e) => {
    e.stopPropagation();
    toggleFavorite(project.id);
  };

  const handleClick = () => {
    if (accessible) {
      onProjectClick(project.id);
    }
  };
  const projectName = project.name || project.projectKey || '';

  return (
    <div className={styles.sidebarProjectNode}>
      <div
        role="button"
        tabIndex={accessible ? 0 : -1}
        className={`${styles.sidebarItem} ${styles.sidebarProjectItem} ${isActive ? styles.sidebarItemActive : ''} ${!accessible ? styles.sidebarItemDisabled : ''}`}
        onClick={handleClick}
        onKeyDown={(e) => { if (e.key === 'Enter') handleClick(); }}
        onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); if (accessible) onCreateChild?.(e, project); }}
        style={{ '--project-depth': depth }}
        title={!accessible ? '접근 권한이 없습니다' : projectName}
      >
        {hasChildren ? (
          <button
            type="button"
            className={styles.sidebarToggle2}
            onClick={handleToggle}
            aria-label={expanded ? '하위 프로젝트 접기' : '하위 프로젝트 펼치기'}
          >
            {expanded ? '▾' : '▸'}
          </button>
        ) : (
          <span className={styles.sidebarTogglePlaceholder} />
        )}
        <span className={styles.sidebarItemLabel}>{projectName}</span>
        {accessible && depth === 0 && (
          <button
            className={`${styles.sidebarFavoriteToggle} ${isFavorite ? styles.sidebarFavoriteToggleActive : ''}`}
            title={isFavorite ? '즐겨찾기 해제' : '즐겨찾기'}
            aria-pressed={isFavorite}
            onClick={handleFavoriteClick}
          >
            {isFavorite ? '\u2605' : '\u2606'}
          </button>
        )}
        {accessible && <span className={styles.sidebarItemActions} aria-label={`${projectName} 작업`}>
          {isMaster && (
            <>
              <button
                className={styles.sidebarItemBtn}
                title="멤버 관리"
                onClick={(e) => { e.stopPropagation(); onManageMembers?.(project); }}
              >&#128101;</button>
              <button
                className={styles.sidebarItemBtn}
                title="편집"
                onClick={(e) => { e.stopPropagation(); onEditProject(e, project); }}
              >&#9998;</button>
              <button
                className={styles.sidebarItemBtn}
                title="삭제"
                onClick={(e) => { e.stopPropagation(); onDeleteProject(e, project); }}
              >&times;</button>
            </>
          )}
        </span>}
      </div>
      {hasChildren && expanded && (
        <div className={styles.sidebarProjectChildren}>
          {project.children.map(child => (
            <SidebarProjectItem
              key={child.id}
              project={child}
              activeProjectId={activeProjectId}
              depth={depth + 1}
              onProjectClick={onProjectClick}
              onEditProject={onEditProject}
              onDeleteProject={onDeleteProject}
              onCreateChild={onCreateChild}
              onManageMembers={onManageMembers}
            />
          ))}
        </div>
      )}
    </div>
  );
}
