// herdr-plugin/src/ui/useTerminalSize.js
import { execFileSync } from 'node:child_process';
import { useEffect, useState } from 'react';

export const FALLBACK_COLUMNS = 80;
export const FALLBACK_ROWS = 24;

// herdr pane 의 테두리가 먹는 폭. rect 107 과 실제 104 의 차이를 재서 얻었다.
export const CHROME_COLUMNS = 3;

const POLL_MS = 250;
const QUERY_TIMEOUT_MS = 3000;

/**
 * 지금 터미널이 알려 주는 크기를 읽는다. 값이 없거나 0 이면 안전한 기본값으로 떨어진다.
 */
export function readSize(stdout) {
  return {
    columns: stdout?.columns || FALLBACK_COLUMNS,
    rows: stdout?.rows || FALLBACK_ROWS,
  };
}

/**
 * herdr pane layout 의 응답에서 크기를 뽑는다.
 *
 * area 는 탭 전체 영역이라 분할된 pane 보다 크다. 그래서 paneId 를 주면 panes 목록에서
 * 그 pane 의 rect 를 먼저 찾고, 찾지 못했을 때만 area 로 떨어진다.
 * 형식이 어긋나거나 크기가 0 이하이면 null 을 돌려주어 호출한 쪽이 폴백하게 한다.
 */
export function parsePaneSize(jsonText, paneId) {
  let parsed;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    return null;
  }

  const layout = parsed?.result?.layout;
  const mine = paneId
    ? layout?.panes?.find(p => p.pane_id === paneId)?.rect
    : undefined;

  return toSize(mine) ?? toSize(layout?.area);
}

function toSize(box) {
  const columns = box?.width;
  const rows = box?.height;
  if (!Number.isFinite(columns) || !Number.isFinite(rows)) return null;
  if (columns <= 0 || rows <= 0) return null;
  return { columns, rows };
}

/**
 * 쓸 크기를 정한다. queryPane 을 주입받으므로 실제 프로세스를 띄우지 않고 테스트할 수 있다.
 *
 * 세로는 언제나 stdout 을 믿는다. herdr 가 알려 주는 높이에는 우리가 그릴 수 없는
 * pane 장식이 섞여 있어(측정: rect 48 행, 실제 46 행) 그대로 쓰면 두 행이 넘쳐
 * 제목줄이 위로 밀려 사라진다.
 *
 * 가로는 herdr 값을 바닥으로 삼는다. 플러그인 pane 은 좁게 떴다가 늘어나는데
 * 그 사이에 읽은 stdout 값에 갇히는 경우가 있기 때문이다. 다만 herdr 의 폭에도
 * 같은 장식이 섞여 있으므로(측정: rect 107, 실제 104) 그만큼 빼고 쓴다.
 * 둘 중 큰 값을 고르므로 stdout 이 이미 정확하면 herdr 때문에 넓어지지 않는다.
 */
export function resolveSize({ paneId, queryPane, stdout }) {
  const own = readSize(stdout);
  if (!paneId || !queryPane) return own;

  const pane = queryPane(paneId);
  if (!pane) return own;

  return {
    columns: Math.max(own.columns, pane.columns - CHROME_COLUMNS),
    rows: own.rows,
  };
}

/**
 * herdr CLI 에 pane 크기를 묻는다. 실패하면 null 을 돌려준다.
 * 응답이 없을 때 앱이 멈추면 안 되므로 반드시 시간 제한을 건다.
 */
export function queryPaneSize(paneId) {
  try {
    const out = execFileSync('herdr', ['pane', 'layout', '--pane', paneId], {
      encoding: 'utf8',
      timeout: QUERY_TIMEOUT_MS,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    return parsePaneSize(out, paneId);
  } catch {
    return null;
  }
}

const currentSize = (stdout) => resolveSize({
  paneId: process.env.HERDR_PANE_ID,
  queryPane: queryPaneSize,
  stdout,
});

/**
 * 터미널 크기를 따라간다. Ink 의 useWindowSize 를 쓰지 않는 이유가 있다.
 *
 * 플러그인 pane 에서는 PTY 에 잘못된 크기가 전달된다. 214x48 인 pane 에서
 * process.stdout.columns 가 50 으로 고정되고, 10 초를 기다려도 바뀌지 않으며
 * resize 이벤트도 오지 않는다. 그래서 stdout 을 믿지 않고 herdr 에게 직접 묻는다.
 *
 * 기동 시에는 동기로 확정한다. 비동기로 하면 처음에 50 열(목록 모드)로 그렸다가
 * 뒤늦게 바뀌어 화면이 튄다. 프로세스를 한 번 띄우는 값은 그 깜빡임보다 싸다.
 * 이후에는 stdout 값이 바뀐 것을 본 순간에만 다시 묻는다. herdr CLI 를 250ms 마다
 * 부르면 프로세스 생성 비용이 크기 때문이다.
 */
export function useTerminalSize(stdout = process.stdout, intervalMs = POLL_MS) {
  const [size, setSize] = useState(() => currentSize(stdout));

  useEffect(() => {
    let seen = readSize(stdout);

    const recheck = () => {
      const now = readSize(stdout);
      if (now.columns === seen.columns && now.rows === seen.rows) return;
      seen = now;

      const next = currentSize(stdout);
      setSize(prev =>
        prev.columns === next.columns && prev.rows === next.rows ? prev : next);
    };

    const timer = setInterval(recheck, intervalMs);
    stdout?.on?.('resize', recheck);

    return () => {
      clearInterval(timer);
      stdout?.off?.('resize', recheck);
    };
  }, [stdout, intervalMs]);

  return size;
}
