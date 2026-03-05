/**
 * SSE(Server-Sent Events) 연결 관리
 * 서버에서 todo_changed 이벤트를 수신하면 onEvent 콜백을 호출합니다.
 * 반환값(disconnect 함수)을 호출하면 연결을 닫습니다.
 */
export function createSseConnection(onEvent, onNotification, onCommentChanged) {
  const es = new EventSource('/api/sse/subscribe', { withCredentials: true });

  es.addEventListener('todo_changed', (e) => {
    try {
      const data = JSON.parse(e.data);
      onEvent(data);
    } catch (_) {
      onEvent({});
    }
  });

  if (onNotification) {
    es.addEventListener('notification', (e) => {
      try {
        const data = JSON.parse(e.data);
        onNotification(data);
      } catch (_) {
        onNotification({});
      }
    });
  }

  if (onCommentChanged) {
    es.addEventListener('comment_changed', (e) => {
      try {
        const data = JSON.parse(e.data);
        onCommentChanged(data);
      } catch (_) {
        onCommentChanged({});
      }
    });
  }

  es.onerror = () => {
    // 브라우저가 자동으로 재연결을 시도하므로 별도 처리 불필요
  };

  return () => es.close();
}
