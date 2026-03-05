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

  const handleToggle = (e) => {
    e.stopPropagation();
    setExpanded(prev => !prev);
  };

  const handleFavoriteClick = (e) => {
    e.stopPropagation();
    toggleFavorite(project.id);
  };

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        className={`${styles.sidebarItem} ${isActive ? styles.sidebarItemActive : ''}`}
        onClick={() => onProjectClick(project.id)}
        onKeyDown={(e) => { if (e.key === 'Enter') onProjectClick(project.id); }}
        onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); onCreateChild?.(e, project); }}
        style={{ paddingLeft: `${8 + depth * 14}px` }}
      >
        {hasChildren ? (
          <span className={styles.sidebarToggle2} onClick={handleToggle}>
            {expanded ? '▾' : '▸'}
          </span>
        ) : (
          <span className={styles.sidebarTogglePlaceholder} />
        )}
        {isFavorite && depth === 0 && <span className={styles.favStar}>&#9733;</span>}
        <span className={styles.sidebarItemLabel} title={project.name || project.projectKey || ''}>{project.name || project.projectKey || ''}</span>
        <span className={styles.sidebarItemActions}>
          {depth === 0 && (
            <button
              className={`${styles.sidebarItemBtn} ${isFavorite ? styles.sidebarFavActive : ''}`}
              title={isFavorite ? '즐겨찾기 해제' : '즐겨찾기'}
              onClick={handleFavoriteClick}
            >
              {isFavorite ? '\u2605' : '\u2606'}
            </button>
          )}
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
        </span>
      </div>
      {hasChildren && expanded && (
        <div>
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
