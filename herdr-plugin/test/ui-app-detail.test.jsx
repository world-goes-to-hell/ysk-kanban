import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render } from 'ink-testing-library';
import { App } from '../src/ui/App.jsx';
import { createStore } from '../src/store.js';

const statuses = [
  { statusKey: 'TODO', name: '할 일', color: '#2563EB', position: 0 },
  { statusKey: 'DONE', name: '완료', color: '#059669', position: 1 },
];

const card = {
  id: 137,
  summary: '사용독려 알림톡 템플릿 추가',
  description: '긴 설명입니다. '.repeat(120),
  statusKey: 'TODO',
  priority: 'HIGH',
  dueDate: '2026-03-31',
};

// 팝업이 뜨면 이 카드는 완전히 가려져야 한다. 제목이 화면에 남으면 뒤가 비치는 것이다.
const hidden = {
  id: 999,
  summary: '가려질제목가려질제목가려질제목',
  statusKey: 'DONE',
  priority: 'LOW',
};

const fakeClient = () => ({
  listProjects: async () => [{ id: 1, name: '테스트' }],
  listStatuses: async () => statuses,
  listTodos: async () => [card, hidden],
  getTodo: async () => card,
  listSubtasks: async () => [],
  listComments: async () => [],
  changeStatus: async () => card,
});

const ENTER = '\r';
const ESC = String.fromCharCode(27);

const tick = (ms = 20) => new Promise(r => setTimeout(r, ms));

/**
 * 조건이 참이 될 때까지 기다린다.
 *
 * 고정 시간을 기다리면 전체 스위트를 함께 돌릴 때 부하에 밀려 간헐적으로 실패한다.
 * 상세를 불러오고 화면이 다시 그려지는 데 걸리는 시간은 그때그때 다르므로 조건으로 기다린다.
 */
async function waitFor(check, label, timeout = 5000) {
  const until = Date.now() + timeout;
  while (Date.now() < until) {
    if (check()) return;
    await tick();
  }
  throw new Error('기다리다 실패했습니다: ' + label);
}

let store;

/** 앱을 띄우고 상세 팝업을 연다. 팝업에 내용이 채워질 때까지 기다린다. */
async function openDetail() {
  const client = fakeClient();
  store = createStore({ client, initialProjectId: 1 });
  await store.loadBoard(1);

  // apiKey 를 비워 SSE 감시를 켜지 않는다. 테스트가 네트워크를 타면 안 된다.
  const r = render(<App store={store} client={client} apiUrl="http://x" apiKey="" />);
  await waitFor(() => r.lastFrame().includes('#137'), '보드가 그려지기');

  r.stdin.write(ENTER);
  await waitFor(() => r.lastFrame().includes('Esc 닫기'), '팝업이 열리기');
  await waitFor(() => r.lastFrame().includes('마감  2026-03-31'), '상세 내용이 채워지기');
  return r;
}

describe('상세 팝업', () => {
  // 이 테스트가 herdr 에 pane 크기를 물어보면 결과가 실행 환경에 따라 달라진다.
  // 환경변수를 비워 stdout 값만 쓰게 하고, 끝나면 되돌린다.
  let savedPaneId;
  beforeEach(() => {
    savedPaneId = process.env.HERDR_PANE_ID;
    delete process.env.HERDR_PANE_ID;
    store = null;
  }, 20000);
  afterEach(() => {
    if (savedPaneId === undefined) delete process.env.HERDR_PANE_ID;
    else process.env.HERDR_PANE_ID = savedPaneId;
  }, 20000);

  it('Enter 로 열린다', async () => {
    const { lastFrame } = await openDetail();
    expect(lastFrame()).toContain('Esc 닫기');
    expect(lastFrame()).toContain('#137');
  }, 20000);

  it('Esc 로 닫힌다', async () => {
    const { stdin, lastFrame } = await openDetail();
    stdin.write(ESC);
    await waitFor(() => !lastFrame().includes('Esc 닫기'), '팝업이 닫히기');
    expect(lastFrame()).not.toContain('Esc 닫기');
  }, 20000);

  it('j 로 아래로 굴린다', async () => {
    const { stdin, lastFrame } = await openDetail();
    const opened = lastFrame();

    stdin.write('j');
    await waitFor(() => lastFrame() !== opened, '한 줄 내려가기');

    expect(lastFrame()).toMatch(/2-\d+\/\d+/); // 두 번째 줄부터 보인다
  }, 20000);

  it('0 아래로는 내려가지 않는다', async () => {
    const { stdin, lastFrame } = await openDetail();
    const opened = lastFrame();

    stdin.write('k');
    stdin.write('k');
    await tick(80);

    expect(lastFrame()).toBe(opened);
  }, 20000);

  it('마지막을 넘어서 내려가지 않는다', async () => {
    const { stdin, lastFrame } = await openDetail();

    // 한 번에 몰아 쓰면 입력이 한 덩어리로 뭉쳐 한 글자로 읽히지 않는다.
    // 화면이 더 바뀌지 않을 때까지 한 번씩 눌러 끝까지 내려간다.
    let prev = lastFrame();
    for (let i = 0; i < 60; i++) {
      stdin.write('j');
      await tick(10);
      if (lastFrame() === prev) break;
      prev = lastFrame();
    }
    const bottom = lastFrame();

    stdin.write('j');
    await tick(80);

    expect(lastFrame()).toBe(bottom);
    // 끝까지 한 번씩 눌러 내려가느라 다른 항목보다 오래 걸린다.
  }, 20000);

  // 사람이 j 를 연달아 누르면 터미널이 여러 글자를 한 덩어리로 보낸다.
  // 한 글자하고만 견주면 그 입력이 통째로 버려져 스크롤이 멈춘 것처럼 보인다.
  it('한 덩어리로 들어온 jjj 는 세 칸 내려간다', async () => {
    const { stdin, lastFrame } = await openDetail();
    const opened = lastFrame();

    stdin.write('jjj');
    await waitFor(() => lastFrame() !== opened, '덩어리 입력이 반영되기');

    expect(lastFrame()).toMatch(/4-\d+\/\d+/);   // 네 번째 줄부터 보인다
  }, 20000);

  // 팝업이 뒤를 가리지 못하면 보드 카드가 팝업 안에 섞여 읽을 수 없다.
  it('팝업이 뒤의 보드를 가린다', async () => {
    const { lastFrame } = await openDetail();

    // 팝업 자리에 있던 카드의 제목이 그대로 남아 있으면 뒤가 비친 것이다.
    expect(lastFrame()).not.toContain(hidden.summary);
    expect(lastFrame()).not.toContain('가려질제목가려질');
  }, 20000);

  it('팝업이 열린 동안 보드 키가 듣지 않는다', async () => {
    const { stdin } = await openDetail();
    const before = store.getState().selected;

    stdin.write('l');
    stdin.write('h');
    await tick(80);

    expect(store.getState().selected).toEqual(before);
  }, 20000);
});
