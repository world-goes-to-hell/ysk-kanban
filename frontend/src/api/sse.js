/**
 * SSE(Server-Sent Events) 연결 관리
 * 서버에서 todo_changed 이벤트를 수신하면 onEvent 콜백을 호출합니다.
 * 반환값(disconnect 함수)을 호출하면 연결을 닫습니다.
 */
export function createSseConnection(onEvent) {
  const es = new EventSource('/api/sse/subscribe', { withCredentials: true });

  es.addEventListener('todo_changed', (e) => {
    try {
      const data = JSON.parse(e.data);
      onEvent(data);
    } catch (_) {
      onEvent({});
    }
  });

  es.onerror = () => {
    // 브라우저가 자동으로 재연결을 시도하므로 별도 처리 불필요
  };

  return () => es.close();
}
