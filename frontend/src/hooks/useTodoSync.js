import { useEffect, useRef } from 'react';
import { createSseConnection } from '../api/sse';

/**
 * SSE를 통해 다른 사용자의 일감 변경을 실시간으로 수신합니다.
 * 현재 보고 있는 프로젝트에 해당하는 이벤트가 오면 onChanged를 호출합니다.
 */
export function useTodoSync(projectId, onChanged) {
  const onChangedRef = useRef(onChanged);
  onChangedRef.current = onChanged;

  useEffect(() => {
    const disconnect = createSseConnection((data) => {
      const eventProjectId = data.projectId != null ? String(data.projectId) : null;
      const currentProjectId = projectId != null ? String(projectId) : null;

      // 같은 프로젝트 이벤트이거나 projectId가 없는 글로벌 이벤트일 때만 갱신
      if (eventProjectId === null || eventProjectId === currentProjectId) {
        onChangedRef.current();
      }
    });

    return disconnect;
  }, [projectId]);
}
