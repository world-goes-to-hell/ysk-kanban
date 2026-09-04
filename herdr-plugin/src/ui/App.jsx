// herdr-plugin/src/ui/App.jsx
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { Box, Text, useApp, useInput, useStdin, useStdout } from 'ink';
import { computeLayout, DETAIL_WIDTH } from '../layout.js';
import { resolveKey } from '../input/keys.js';
import { parseMouse, enableMouse, disableMouse, createMouseHandler } from '../input/mouse.js';
import { createMutations } from '../mutations.js';
import { watchBoard } from '../api/sse.js';
import { loadConfig, saveConfig } from '../config.js';
import { Board } from './Board.jsx';
import { Chrome } from './Chrome.jsx';
import { Detail } from './Detail.jsx';
import { Palette } from './Palette.jsx';
import { Confirm } from './Confirm.jsx';
import { Input } from './Input.jsx';
import { Help } from './Help.jsx';
import { useTerminalSize } from './useTerminalSize.js';

const EMPTY_DETAIL = { card: null, subtasks: [], comments: [], loading: false };
const FOOTER_ROWS = 1;
const FAR = 9999; // 칸의 처음·끝으로 보낼 때 쓰는 충분히 큰 걸음. store 가 범위를 잘라 준다.
const MODAL_TOP = 3;
const MODAL_WIDTH = { status: 40, filter: 40, project: 44, search: 60, help: 44, confirm: 50 };

const PRIORITIES = [
  { id: 'ALL', label: '전체', value: null },
  { id: 'HIGH', label: '높음', value: 'HIGH' },
  { id: 'MEDIUM', label: '보통', value: 'MEDIUM' },
  { id: 'LOW', label: '낮음', value: 'LOW' },
];

/**
 * 선택한 칸이 화면 밖으로 밀려났을 때 보이게 하려면 가로 위치를 어디로 옮겨야 하는지 셈한다.
 * 이미 보이면 지금 값을 그대로 돌려주므로, 결과를 다시 넣어도 더 움직이지 않는다.
 * (움직이면 layout 이 다시 계산되고 그것이 또 옮겨 화면이 끝없이 다시 그려진다.)
 */
export function nextColumnOffset({ statuses, visibleColumns, selectedStatusKey, columnOffset }) {
  if (!selectedStatusKey) return columnOffset;
  if (visibleColumns.includes(selectedStatusKey)) return columnOffset;

  const at = statuses.findIndex(s => s.statusKey === selectedStatusKey);
  if (at === -1) return columnOffset;

  const shown = Math.max(1, visibleColumns.length);
  return at < columnOffset ? at : Math.max(0, at - shown + 1);
}

/** 본문이 시작하는 줄. layout 이 만든 칸 머리 위치에서 끌어낸다. */
function bodyTopOf(layout) {
  return layout.regions.find(r => r.kind === 'column-header')?.y ?? 2;
}

/** 팔레트 세 가지가 무엇을 보여줄지 정한다. */
function paletteOf(modal, state) {
  if (modal.kind === 'status') {
    return {
      title: '어느 칸으로 옮길까요',
      items: state.statuses.map(s => ({ id: s.statusKey, label: s.name, color: s.color })),
    };
  }
  if (modal.kind === 'filter') return { title: '우선순위로 거르기', items: PRIORITIES };
  return { title: '프로젝트 고르기', items: state.projects.map(p => ({ id: p.id, label: p.name })) };
}

function modalNode(modal, state) {
  if (modal.kind === 'help') return <Help width={MODAL_WIDTH.help} />;

  if (modal.kind === 'confirm') {
    return (
      <Confirm width={MODAL_WIDTH.confirm} message="완료 칸으로 옮길까요?"
               detail={`끝나지 않은 하위 일감이 ${modal.pending}건 있습니다`} />
    );
  }

  if (modal.kind === 'search') {
    return (
      <Input width={MODAL_WIDTH.search} title="제목으로 찾기" value={modal.value}
             placeholder="글자를 입력하면 바로 걸러집니다" />
    );
  }

  const { title, items } = paletteOf(modal, state);
  return (
    <Palette width={MODAL_WIDTH[modal.kind]} title={title}
             items={items} selectedIndex={modal.index} />
  );
}

/** 눈에 보이는 한 글자인지 본다. 조합키와 제어문자는 검색어에 넣지 않는다. */
function isTypable(input, key) {
  return input.length === 1 && input >= ' ' && !key.ctrl && !key.meta;
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
  const [modal, setModal] = useState(null);

  const mutations = useMemo(() => createMutations({ store, client }), [store, client]);

  // 검색어와 우선순위 필터를 거친 목록. 좌표 계산과 그리기가 같은 목록을 봐야
  // 화면에 안 보이는 카드가 클릭 판정에 남는 일이 없다.
  const visibleCards = useMemo(() => Object.fromEntries(
    state.statuses.map(s => [s.statusKey, store.visibleCards(s.statusKey)]),
  ), [store, state.statuses, state.cardsByStatus, state.filter]);

  // pane 크기는 layout 계산과 Chrome 에 같은 값이 들어가야 한다.
  // 다른 값을 넣으면 그리는 곳과 마우스 판정이 어긋난다.
  const layout = computeLayout({
    columns, rows,
    statuses: state.statuses,
    cardsByStatus: visibleCards,
    scroll: state.scroll,
    collapsed: state.collapsed,
    columnOffset: state.columnOffset,
  });

  // 마우스 처리기는 한 번만 만들고 계속 쓰므로, 바뀌는 값은 상자에 담아 건넨다.
  const layoutRef = useRef(null);
  layoutRef.current = layout;
  const modalRef = useRef(null);

  /**
   * 팝업 상태는 상자에도 함께 담는다. useInput 콜백은 직전 렌더의 값을 보기 때문에,
   * 키가 연달아 들어오면 이미 닫은 팝업이 아직 열린 것으로 보여 다음 키를 삼킨다.
   * (Esc 로 도움말을 닫자마자 누른 '/' 가 사라지는 식이다.)
   */
  const setModalNow = useCallback((next) => {
    modalRef.current = next;
    setModal(next);
  }, []);

  const selectByCardId = useCallback((cardId) => {
    const { cardsByStatus } = store.getState();
    const statusKey = Object.keys(cardsByStatus)
      .find(k => cardsByStatus[k].some(c => c.id === cardId));
    if (statusKey) store.selectCard(statusKey, cardId);
  }, [store]);

  const countPending = useCallback(async (cardId) => {
    try {
      const subs = await client.listSubtasks(cardId);
      return subs.filter(s => (s.statusKey ?? s.status) !== 'DONE').length;
    } catch {
      return 0;
    }
  }, [client]);

  /**
   * 상태 변경을 요청한다. 키보드와 마우스가 모두 이 길로 들어와야
   * 완료 확인이 한쪽에서만 뜨는 일이 없다.
   */
  const requestStatus = useCallback(async (cardId, statusKey) => {
    const r = await mutations.changeStatus(cardId, statusKey, { confirmSubtasks: false });
    if (r === 'done') { store.selectCard(statusKey, cardId); return; }
    if (r === 'needs-confirm') {
      setModalNow({ kind: 'confirm', cardId, statusKey, pending: await countPending(cardId) });
    }
  }, [mutations, store, countPending]);

  const confirmStatus = useCallback(async (m) => {
    setModalNow(null);
    const r = await mutations.changeStatus(m.cardId, m.statusKey, { confirmSubtasks: true });
    if (r === 'done') store.selectCard(m.statusKey, m.cardId);
  }, [mutations, store]);

  const moveStatusBy = useCallback((delta) => {
    const { selected, statuses } = store.getState();
    if (!selected?.cardId) return;
    const at = statuses.findIndex(s => s.statusKey === selected.statusKey);
    const next = statuses[at + delta];
    if (next) void requestStatus(selected.cardId, next.statusKey);
  }, [store, requestStatus]);

  const commitPalette = useCallback(async (m) => {
    const { items } = paletteOf(m, store.getState());
    const item = items[m.index];
    setModalNow(null);
    if (!item) return;

    if (m.kind === 'status') {
      const sel = store.getState().selected;
      if (sel?.cardId) await requestStatus(sel.cardId, item.id);
    } else if (m.kind === 'filter') {
      store.setFilter({ priority: item.value });
    } else if (m.kind === 'project') {
      await store.loadBoard(item.id);
      saveConfig({ ...loadConfig(), lastProjectId: item.id });
    }
  }, [store, requestStatus]);

  const typeSearch = useCallback((m, input, key) => {
    if (key.escape) { store.setFilter({ query: '' }); setModalNow(null); return; }
    if (key.return) { setModalNow(null); return; }

    let next = m.value;
    if (key.backspace || key.delete) next = m.value.slice(0, -1);
    else if (isTypable(input, key)) next = m.value + input;
    if (next === m.value) return;

    setModalNow({ kind: 'search', value: next });
    store.setFilter({ query: next });   // 입력하는 동안 바로 걸러진다
  }, [store]);

  /** 팝업이 떠 있으면 키를 모두 팝업이 가져간다. 처리했으면 true 를 돌려준다. */
  const handleModalKey = useCallback((m, input, key) => {
    if (m.kind === 'help') { setModalNow(null); return; }
    if (m.kind === 'search') { typeSearch(m, input, key); return; }

    if (m.kind === 'confirm') {
      if (input === 'y') void confirmStatus(m);
      else if (input === 'n' || key.escape) setModalNow(null);
      return;
    }

    if (key.escape) { setModalNow(null); return; }
    if (key.return) { void commitPalette(m); return; }

    const count = paletteOf(m, store.getState()).items.length;
    const step = (input === 'j' || key.downArrow) ? 1 : (input === 'k' || key.upArrow) ? -1 : 0;
    if (step === 0) return;
    setModalNow({ ...m, index: Math.min(count - 1, Math.max(0, m.index + step)) });
  }, [store, typeSearch, confirmStatus, commitPalette]);

  // 선택한 칸이 화면 밖이면 보이도록 가로 위치를 맞춘다. 값이 실제로 달라질 때만 바꾼다.
  useEffect(() => {
    if (layout.mode === 'list') return;
    const next = nextColumnOffset({
      statuses: state.statuses,
      visibleColumns: layout.visibleColumns,
      selectedStatusKey: state.selected?.statusKey,
      columnOffset: state.columnOffset,
    });
    if (next !== state.columnOffset) store.setColumnOffset(next);
  }, [store, state.statuses, state.selected?.statusKey, state.columnOffset,
      layout.mode, layout.visibleColumns.join(',')]);

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
        if (statusKey) void requestStatus(id, statusKey);
      },
    });

    const onData = (buf) => {
      if (modalRef.current) return;          // 팝업이 떠 있으면 보드를 만지지 않는다
      const ev = parseMouse(buf.toString());
      if (ev) handle(ev);
    };

    stdin.on('data', onData);
    return () => { stdin.off('data', onData); disableMouse(stdout); };
  }, [mouseOn, stdin, stdout, store, selectByCardId, requestStatus]);

  useInput((input, key) => {
    // 마우스 시퀀스가 키로 흘러들면 엉뚱한 동작이 된다. 예를 들어 뗌 시퀀스는 'm' 으로
    // 끝나는데 'm' 은 마우스 끄기다. 마우스로 읽히는 입력은 여기서 걸러낸다.
    if (parseMouse(input)) return;

    const open = modalRef.current;
    if (open) return handleModalKey(open, input, key);

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
      case 'change-status': return setModalNow({ kind: 'status', index: 0 });
      case 'search': return setModalNow({ kind: 'search', value: state.filter.query });
      case 'filter': return setModalNow({ kind: 'filter', index: 0 });
      case 'project': return setModalNow({ kind: 'project', index: 0 });
      case 'help': return setModalNow({ kind: 'help' });
      case 'open-detail': return store.setFocus('detail');
      case 'toggle-focus': return store.setFocus(state.focus === 'board' ? 'detail' : 'board');
      case 'toggle-mouse': return setMouseOn(v => !v);
      case 'refresh': return void store.loadBoard(state.projectId);
      case 'quit': return exit();
      default: return; // 나머지는 웹과 MCP 도구가 맡는다
    }
  });

  if (state.loading && state.statuses.length === 0) {
    return <Text color="gray">불러오는 중…</Text>;
  }

  const projectName = state.projects.find(p => p.id === state.projectId)?.name;
  const statusName = state.statuses.find(s => s.statusKey === state.selected?.statusKey)?.name;
  const bodyTop = bodyTopOf(layout);
  const detailHeight = Math.max(1, rows - bodyTop - FOOTER_ROWS);
  const modalLeft = modal ? Math.max(0, Math.floor((columns - MODAL_WIDTH[modal.kind]) / 2)) : 0;

  return (
    <Chrome projectName={projectName} columns={columns} rows={rows}
            connected={connected} error={state.error} mode={layout.mode}>
      <Box width={columns} height={rows}>
        <Box position="absolute" marginTop={0} marginLeft={0}>
          <Board layout={layout} statuses={state.statuses}
                 cardsByStatus={visibleCards} selected={state.selected}
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

        {/*
          팝업은 마지막에 그려야 보드 위에 덮인다. 배경색을 주지 않으면 글자가 없는 칸이
          칠해지지 않아 뒤의 카드 테두리가 팝업 안으로 비쳐 읽을 수 없다.
        */}
        {modal && (
          <Box position="absolute" marginLeft={modalLeft} marginTop={MODAL_TOP}
               backgroundColor="black">
            {modalNode(modal, state)}
          </Box>
        )}
      </Box>
    </Chrome>
  );
}
