import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import projectAPI from '../api/projects';
import { useToast } from '../hooks/useToast';
import { useLoading } from '../hooks/useLoading';

const ProjectContext = createContext();

export function ProjectProvider({ children }) {
  const [projects, setProjects] = useState([]);
  const [projectTree, setProjectTree] = useState([]);
  const [favoriteIds, setFavoriteIds] = useState(new Set());
  const showToast = useToast();
  const { showLoading, hideLoading } = useLoading();

  const loadProjects = useCallback(async () => {
    try {
      const data = await projectAPI.list();
      setProjects(Array.isArray(data) ? data : []);
    } catch {
      setProjects([]);
    }
  }, []);

  const loadProjectTree = useCallback(async () => {
    try {
      const data = await projectAPI.tree();
      setProjectTree(Array.isArray(data) ? data : []);
    } catch {
      setProjectTree([]);
    }
  }, []);

  const loadFavorites = useCallback(async () => {
    try {
      const ids = await projectAPI.getFavorites();
      setFavoriteIds(new Set(Array.isArray(ids) ? ids : []));
    } catch {
      setFavoriteIds(new Set());
    }
  }, []);

  useEffect(() => {
    loadProjects();
    loadProjectTree();
    loadFavorites();
  }, [loadProjects, loadProjectTree, loadFavorites]);

  const createProject = useCallback(async (data) => {
    showLoading();
    try {
      await projectAPI.create(data);
      showToast('프로젝트가 생성되었습니다.', 'success');
      await loadProjects();
      await loadProjectTree();
    } catch (err) {
      showToast(`프로젝트 저장에 실패했습니다: ${err.message}`, 'error');
      throw err;
    } finally {
      hideLoading();
    }
  }, [showLoading, hideLoading, showToast, loadProjects, loadProjectTree]);

  const updateProject = useCallback(async (id, data) => {
    showLoading();
    try {
      await projectAPI.update(id, data);
      showToast('프로젝트가 수정되었습니다.', 'success');
      await loadProjects();
      await loadProjectTree();
    } catch (err) {
      showToast(`프로젝트 저장에 실패했습니다: ${err.message}`, 'error');
      throw err;
    } finally {
      hideLoading();
    }
  }, [showLoading, hideLoading, showToast, loadProjects, loadProjectTree]);

  const deleteProject = useCallback(async (id) => {
    showLoading();
    try {
      await projectAPI.delete(id);
      showToast('프로젝트가 삭제되었습니다.', 'success');
      await loadProjects();
      await loadProjectTree();
    } catch (err) {
      showToast(`프로젝트 삭제에 실패했습니다: ${err.message}`, 'error');
      throw err;
    } finally {
      hideLoading();
    }
  }, [showLoading, hideLoading, showToast, loadProjects, loadProjectTree]);

  const toggleFavorite = useCallback(async (projectId) => {
    try {
      const result = await projectAPI.toggleFavorite(projectId);
      setFavoriteIds(prev => {
        const next = new Set(prev);
        if (result.favorited) {
          next.add(projectId);
        } else {
          next.delete(projectId);
        }
        return next;
      });
    } catch (err) {
      showToast(`즐겨찾기 변경에 실패했습니다: ${err.message}`, 'error');
    }
  }, [showToast]);

  return (
    <ProjectContext.Provider value={{ projects, projectTree, favoriteIds, loadProjects, loadProjectTree, loadFavorites, createProject, updateProject, deleteProject, toggleFavorite }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProjects() {
  return useContext(ProjectContext);
}
