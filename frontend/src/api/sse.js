/**
 * SSE(Server-Sent Events) 연결 관리
 * 서버에서 todo_changed 이벤트를 수신하면 onEvent 콜백을 호출합니다.
 * 반환값(disconnect 함수)을 호출하면 연결을 닫습니다.
 */
export function createSseConnection(handlers) {
  const es = new EventSource('/api/sse/subscribe', { withCredentials: true });

  const wire = (event, handler) => {
    if (!handler) return;
    es.addEventListener(event, (e) => {
      try {
        handler(JSON.parse(e.data));
      } catch (_) {
        handler({});
      }
    });
  };

  // 하위 호환: 함수 시그니처로 호출된 경우 (onEvent, onNotification, onCommentChanged)
  if (typeof handlers === 'function') {
    const [onEvent, onNotification, onCommentChanged] = arguments;
    wire('todo_changed', onEvent);
    wire('notification', onNotification);
    wire('comment_changed', onCommentChanged);
  } else {
    wire('todo_changed', handlers.onTodoChanged);
    wire('notification', handlers.onNotification);
    wire('comment_changed', handlers.onCommentChanged);
    wire('chat_message', handlers.onChatMessage);
    wire('discussion_started', handlers.onDiscussionStarted);
    wire('discussion_ended', handlers.onDiscussionEnded);
  }

  es.onerror = () => {
    // 브라우저가 자동으로 재연결을 시도하므로 별도 처리 불필요
  };

  return () => es.close();
}
