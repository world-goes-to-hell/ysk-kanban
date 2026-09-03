// herdr-plugin/src/ui/App.jsx
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { Box, Text, useApp, useInput, useStdin, useStdout } from 'ink';
import { computeLayout, DETAIL_WIDTH } from '../layout.js';
import { resolveKey } from '../input/keys.js';
import { parseMouse, enableMouse, disableMouse, createMouseHandler } from '../input/mouse.js';
import { createMutations } from '../mutations.js';
import { watchBoard } from '../api/sse.js';
import { Board } from './Board.jsx';
import { Chrome } from './Chrome.jsx';
import { Detail } from './Detail.jsx';
import { useTerminalSize } from './useTerminalSize.js';

const EMPTY_DETAIL = { card: null, subtasks: [], comments: [], loading: false };
const FOOTER_ROWS = 1;
const FAR = 9999; // 칸의 처음·끝으로 보낼 때 쓰는 충분히 큰 걸음. store 가 범위를 잘라 준다.

/** 본문이 시작하는 줄. layout 이 만든 칸 머리 위치에서 끌어낸다. */
function bodyTopOf(layout) {
  return layout.regions.find(r => r.kind === 'column-header')?.y ?? 2;
}

export function App({ store, client, apiUrl, apiKey }) {
  const { exit } = useApp();
  const { stdout } = useStdout();
  const { stdin } = useStdin();
  const { columns, rows } = useTerminalSize(stdout);
  const state = useSyncExternalStore(store.subscribe, store.getState);

  const [connected, setConnected] = useState(false);
  const [detail, setDetail] = useState(EMPTY_DETAIL);
  const [mouseOn, setMouseOn] = useState(true);
  const [dragging, setDragging] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);

  const mutations = useMemo(() => createMutations({ store, client }), [store, client]);

  // pane 크기는 layout 계산과 Chrome 에 같은 값이 들어가야 한다.
  // 다른 값을 넣으면 그리는 곳과 마우스 판정이 어긋난다.
  const layout = computeLayout({
    columns, rows,
    statuses: state.statuses,
    cardsByStatus: state.cardsByStatus,
    scroll: state.scroll,
    collapsed: state.collapsed,
    columnOffset: state.columnOffset,
  });

  // 마우스 처리기는 한 번만 만들고 계속 쓰므로, 최신 좌표표를 상자에 담아 건넨다.
  const layoutRef = useRef(null);
  layoutRef.current = layout;

  const selectByCardId = useCallback((cardId) => {
    const { cardsByStatus } = store.getState();
    const statusKey = Object.keys(cardsByStatus)
      .find(k => cardsByStatus[k].some(c => c.id === cardId));
    if (statusKey) store.selectCard(statusKey, cardId);
  }, [store]);

  const applyStatus = useCallback(async (cardId, statusKey) => {
    // 완료 칸으로 옮길 때 미완료 하위 일감이 있으면 원래는 사용자에게 확인을 받아야 한다.
    // 확인 대화 컴포넌트가 아직 없으므로 지금은 이미 확인된 것으로 보고 그대로 진행한다.
    // 대화가 붙으면 confirmSubtasks 를 빼고 'needs-confirm' 응답을 받아 대화를 띄운다.
    const result = await mutations.changeStatus(cardId, statusKey, { confirmSubtasks: true });
    if (result === 'done') store.selectCard(statusKey, cardId);
  }, [mutations, store]);

  const moveStatusBy = useCallback((delta) => {
    const { selected, statuses } = store.getState();
    if (!selected?.cardId) return;
    const at = statuses.findIndex(s => s.statusKey === selected.statusKey);
    const next = statuses[at + delta];
    if (next) void applyStatus(selected.cardId, next.statusKey);
  }, [store, applyStatus]);

  useEffect(() => { store.loadProjects(); }, [store]);

  // 선택이 바뀌면 그 일감의 상세를 불러온다.
  useEffect(() => {
    const id = state.selected?.cardId;
    if (!id) { setDetail(EMPTY_DETAIL); return; }

    let alive = true;
    setDetail(d => ({ ...d, loading: true }));

    Promise.all([client.getTodo(id), client.listSubtasks(id), client.listComments(id)])
      .then(([card, subtasks, comments]) => {
        if (alive) setDetail({ card, subtasks, comments, loading: false });
      })
      .catch(e => {
        if (!alive) return;
        store.setError(e.message);
        setDetail(d => ({ ...d, loading: false }));
      });

    return () => { alive = false; };
  }, [state.selected?.cardId, client, store]);

  // 보드 변경 감시. SSE 가 붙으면 '실시간', 실패해 폴링으로 내려가면 '주기 갱신' 이 뜬다.
  useEffect(() => {
    if (!state.projectId || !apiKey) return;
    return watchBoard({
      apiUrl, apiKey, projectId: state.projectId,
      onChange: () => { void store.loadBoard(state.projectId); },
      onStatus: (s) => setConnected(s === 'live'),
    });
  }, [state.projectId, apiUrl, apiKey, store]);

  // 마우스 보고를 켠 채 종료하면 그 터미널이 클릭과 드래그 선택에 반응하지 않는 상태로
  // 남는다. 사용자가 터미널을 다시 띄워야 하므로 어떤 경로로 끝나든 반드시 끈다.
  useEffect(() => {
    const off = () => disableMouse(process.stdout);
    const onSigint = () => { off(); process.exit(130); };
    const onSigterm = () => { off(); process.exit(143); };

    process.on('exit', off);
    process.on('SIGINT', onSigint);
    process.on('SIGTERM', onSigterm);

    return () => {
      process.off('exit', off);
      process.off('SIGINT', onSigint);
      process.off('SIGTERM', onSigterm);
    };
  }, []);

  // Ink 의 useInput 은 마우스 시퀀스를 키로 잘못 읽으므로 raw stdin 에서 따로 받는다.
  useEffect(() => {
    if (!mouseOn) { disableMouse(stdout); return; }
    enableMouse(stdout);

    const handle = createMouseHandler({
      getLayout: () => layoutRef.current,
      onClick: (r) => {
        if (r.kind === 'card') selectByCardId(r.id);
        else if (r.kind === 'column-header') store.toggleCollapse(r.id);
      },
      onDoubleClick: (r) => {
        if (r.kind !== 'card') return;
        selectByCardId(r.id);
        store.setFocus('detail');
      },
      onWheel: (statusKey, delta) => store.scrollColumn(statusKey, delta),
      onDragStart: (id) => setDragging(id),
      onDragMove: (statusKey) => setDropTarget(statusKey),
      onDragEnd: (id, statusKey) => {
        setDragging(null);
        setDropTarget(null);
        if (statusKey) void applyStatus(id, statusKey);
      },
    });

    const onData = (buf) => {
      const ev = parseMouse(buf.toString());
      if (ev) handle(ev);
    };

    stdin.on('data', onData);
    return () => { stdin.off('data', onData); disableMouse(stdout); };
  }, [mouseOn, stdin, stdout, store, selectByCardId, applyStatus]);

  useInput((input, key) => {
    // 마우스 시퀀스가 키로 흘러들면 엉뚱한 동작이 된다. 예를 들어 뗌 시퀀스는 'm' 으로
    // 끝나는데 'm' 은 마우스 끄기다. 마우스로 읽히는 입력은 여기서 걸러낸다.
    if (parseMouse(input)) return;

    const action = resolveKey(input, key);
    if (!action) return;

    switch (action.type) {
      case 'move-down': return store.moveSelection(1);
      case 'move-up': return store.moveSelection(-1);
      case 'move-left': return store.moveColumn(-1);
      case 'move-right': return store.moveColumn(1);
      case 'column-first': return store.moveSelection(-FAR);
      case 'column-last': return store.moveSelection(FAR);
      case 'move-status-left': return moveStatusBy(-1);
      case 'move-status-right': return moveStatusBy(1);
      // 상태 고르기 팔레트가 아직 없으므로, 지금은 다음 칸으로 한 칸 옮긴다.
      case 'change-status': return moveStatusBy(1);
      case 'open-detail': return store.setFocus('detail');
      case 'toggle-focus': return store.setFocus(state.focus === 'board' ? 'detail' : 'board');
      case 'toggle-mouse': return setMouseOn(v => !v);
      case 'refresh': return void store.loadBoard(state.projectId);
      case 'quit': return exit();
      default: return; // 나머지는 이후 태스크에서 붙인다
    }
  });

  if (state.loading && state.statuses.length === 0) {
    return <Text color="gray">불러오는 중…</Text>;
  }

  const projectName = state.projects.find(p => p.id === state.projectId)?.name;
  const statusName = state.statuses.find(s => s.statusKey === state.selected?.statusKey)?.name;
  const bodyTop = bodyTopOf(layout);
  const detailHeight = Math.max(1, rows - bodyTop - FOOTER_ROWS);

  return (
    <Chrome projectName={projectName} columns={columns} rows={rows}
            connected={connected} error={state.error}>
      <Box width={columns} height={rows}>
        <Box position="absolute" marginTop={0} marginLeft={0}>
          <Board layout={layout} statuses={state.statuses}
                 cardsByStatus={state.cardsByStatus} selected={state.selected}
                 dragging={dragging} dropTarget={dropTarget} />
        </Box>

        {layout.mode === 'board-detail' && (
          // Detail 은 스스로 높이를 제한하지 않는다. 구획이 모두 나오면 서른 줄을 넘어
          // 화면을 밀어 올리므로, 남은 높이만큼만 두고 넘치는 부분은 잘라낸다.
          <Box position="absolute" marginLeft={layout.detailX} marginTop={bodyTop}
               width={DETAIL_WIDTH} height={detailHeight} overflow="hidden">
            <Detail card={detail.card} subtasks={detail.subtasks} comments={detail.comments}
                    statusName={statusName} width={DETAIL_WIDTH} loading={detail.loading} />
          </Box>
        )}
      </Box>
    </Chrome>
  );
}
