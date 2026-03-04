import { useState, useCallback } from 'react';
import todoAPI from '../api/todos';
import { useToast } from './useToast';
import { useLoading } from './useLoading';
import { STATUS_LABEL } from '../utils/constants';

export function useTodos() {
  const [todos, setTodos] = useState([]);
  const showToast = useToast();
  const { showLoading, hideLoading } = useLoading();

  const loadTodos = useCallback(async (projectId) => {
    showLoading();
    try {
      const data = await todoAPI.list(projectId);
      setTodos(Array.isArray(data) ? data : []);
    } catch (err) {
      showToast(`일감을 불러오는데 실패했습니다: ${err.message}`, 'error');
    } finally {
      hideLoading();
    }
  }, [showLoading, hideLoading, showToast]);

  const createTodo = useCallback(async (data) => {
    showLoading();
    try {
      const saved = await todoAPI.create(data);
      showToast(`일감 #${saved?.id || '새'}이(가) 생성되었습니다.`, 'success');
      return saved;
    } catch (err) {
      showToast(`저장에 실패했습니다: ${err.message}`, 'error');
      throw err;
    } finally {
      hideLoading();
    }
  }, [showLoading, hideLoading, showToast]);

  const updateTodo = useCallback(async (id, data) => {
    showLoading();
    try {
      const saved = await todoAPI.update(id, data);
      showToast(`일감 #${id}이(가) 수정되었습니다.`, 'success');
      return saved;
    } catch (err) {
      showToast(`저장에 실패했습니다: ${err.message}`, 'error');
      throw err;
    } finally {
      hideLoading();
    }
  }, [showLoading, hideLoading, showToast]);

  const changeStatus = useCallback(async (id, status) => {
    showLoading();
    try {
      await todoAPI.changeStatus(id, status);
      showToast(`상태가 "${STATUS_LABEL[status]}"(으)로 변경되었습니다.`, 'success');
    } catch (err) {
      showToast(`상태 변경에 실패했습니다: ${err.message}`, 'error');
      throw err;
    } finally {
      hideLoading();
    }
  }, [showLoading, hideLoading, showToast]);

  const reorderTodos = useCallback(async (orderedIds) => {
    try {
      await todoAPI.reorder(orderedIds);
    } catch (err) {
      showToast(`순서 변경에 실패했습니다: ${err.message}`, 'error');
      throw err;
    }
  }, [showToast]);

  const deleteTodo = useCallback(async (id) => {
    showLoading();
    try {
      await todoAPI.delete(id);
      showToast(`일감 #${id}이(가) 삭제되었습니다.`, 'success');
    } catch (err) {
      showToast(`삭제에 실패했습니다: ${err.message}`, 'error');
      throw err;
    } finally {
      hideLoading();
    }
  }, [showLoading, hideLoading, showToast]);

  return { todos, setTodos, loadTodos, createTodo, updateTodo, changeStatus, reorderTodos, deleteTodo };
}
