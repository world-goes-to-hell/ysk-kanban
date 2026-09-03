/** 관심 있는 이벤트. 나머지(알림·토론)는 보드와 무관하므로 무시한다. */
const WATCHED = new Set(['todo_changed', 'comment_changed']);

/**
 * SSE 스트림 버퍼에서 완성된 프레임만 떼어낸다.
 * 마지막 조각은 아직 덜 온 것일 수 있으므로 rest 로 돌려준다.
 */
export function parseFrames(buffer) {
  const chunks = buffer.split('\n\n');
  const rest = chunks.pop() ?? '';
  const frames = [];

  for (const chunk of chunks) {
    let event = 'message';
    let data = '';

    for (const line of chunk.split('\n')) {
      if (line.startsWith(':')) continue;                       // 하트비트 주석
      if (line.startsWith('event:')) event = line.slice(6).trim();
      else if (line.startsWith('data:')) data += line.slice(5).trim();
    }

    if (data) frames.push({ event, data });
  }

  return { frames, rest };
}

/**
 * 보드 변경을 감시한다. SSE 를 먼저 시도하고, 실패하면 주기 폴링으로 내려간다.
 * 반환값을 부르면 감시를 멈춘다.
 *
 * 서버는 모든 프로젝트의 이벤트를 한 스트림으로 보내므로
 * 페이로드의 projectId 로 지금 보고 있는 프로젝트만 걸러낸다.
 */
export function watchBoard({
  apiUrl, apiKey, projectId, onChange, onStatus,
  fetchImpl = globalThis.fetch, pollMs = 30000,
}) {
  let stopped = false;
  let timer = null;
  let controller = null;

  const base = apiUrl.replace(/\/+$/, '');

  function startPolling() {
    if (stopped) return;
    onStatus('polling');
    timer = setInterval(() => { if (!stopped) onChange(); }, pollMs);
  }

  /** 이 프레임이 지금 보고 있는 보드와 관련 있는지 본다. */
  function concerns(frame) {
    if (!WATCHED.has(frame.event)) return false;
    if (frame.event === 'comment_changed') return true;   // todoId 만 오므로 그냥 갱신한다

    try {
      const payload = JSON.parse(frame.data);
      return payload.projectId === projectId;
    } catch {
      return true;    // 파싱에 실패하면 놓치는 것보다 갱신하는 편이 낫다
    }
  }

  async function startSse() {
    controller = new AbortController();
    let res;
    try {
      res = await fetchImpl(`${base}/api/sse/subscribe`, {
        headers: { Authorization: `Bearer ${apiKey}`, Accept: 'text/event-stream' },
        signal: controller.signal,
      });
    } catch {
      return startPolling();
    }

    if (stopped) return;
    if (!res.ok || !res.body) return startPolling();

    onStatus('live');
    try {
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (!stopped) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const { frames, rest } = parseFrames(buffer);
        buffer = rest;

        if (frames.some(concerns)) onChange();
      }
    } catch {
      // 스트림이 끊겼다
    }

    if (!stopped) startPolling();
  }

  startSse();

  return function stop() {
    stopped = true;
    if (timer) clearInterval(timer);
    controller?.abort();
  };
}
