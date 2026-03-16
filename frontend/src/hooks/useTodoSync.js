import { useEffect, useRef } from 'react';

/**
 * AppLayout의 전역 SSE 연결에서 todo_changed 이벤트를 수신합니다.
 * 현재 보고 있는 프로젝트에 해당하는 이벤트가 오면 onChanged를 호출합니다.
 */
export function useTodoSync(projectId, onChanged) {
  const onChangedRef = useRef(onChanged);
  onChangedRef.current = onChanged;

  useEffect(() => {
    const handler = (e) => {
      const data = e.detail || {};
      const eventProjectId = data.projectId != null ? String(data.projectId) : null;
      const currentProjectId = projectId != null ? String(projectId) : null;

      if (eventProjectId === null || eventProjectId === currentProjectId) {
        onChangedRef.current();
      }
    };

    window.addEventListener('todo_changed', handler);
    return () => window.removeEventListener('todo_changed', handler);
  }, [projectId]);
}
