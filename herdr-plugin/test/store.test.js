import { describe, it, expect, vi } from 'vitest';
import { createStore } from '../src/store.js';

const statuses = [
  { statusKey: 'TODO', name: '할 일', position: 0 },
  { statusKey: 'DONE', name: '완료', position: 1 },
];

const threeStatuses = [
  { statusKey: 'TODO', name: '할 일', position: 0 },
  { statusKey: 'DOING', name: '진행', position: 1 },
  { statusKey: 'DONE', name: '완료', position: 2 },
];

const todos = [
  { id: 1, summary: '첫째', statusKey: 'TODO', priority: 'HIGH' },
  { id: 2, summary: '둘째', statusKey: 'TODO', priority: 'LOW' },
  { id: 3, summary: '셋째', statusKey: 'DONE', priority: 'MEDIUM' },
];

function fakeClient(over = {}) {
  return {
    listProjects: vi.fn().mockResolvedValue([{ id: 3, name: 'MBRIS' }]),
    listStatuses: vi.fn().mockResolvedValue(statuses),
    listTodos: vi.fn().mockResolvedValue(todos),
    ...over,
  };
}

describe('보드 적재', () => {
  it('카드를 statusKey 별로 나눈다', async () => {
    const s = createStore({ client: fakeClient() });
    await s.loadBoard(3);
    expect(s.getState().cardsByStatus.TODO.map(c => c.id)).toEqual([1, 2]);
    expect(s.getState().cardsByStatus.DONE.map(c => c.id)).toEqual([3]);
  });

  it('카드가 없는 칸도 빈 배열을 갖는다', async () => {
    const s = createStore({ client: fakeClient({ listTodos: vi.fn().mockResolvedValue([]) }) });
    await s.loadBoard(3);
    expect(s.getState().cardsByStatus.TODO).toEqual([]);
  });

  it('적재 중에는 loading 이 true 다', async () => {
    let seen = false;
    const s = createStore({ client: fakeClient() });
    s.subscribe(() => { if (s.getState().loading) seen = true; });
    await s.loadBoard(3);
    expect(seen).toBe(true);
    expect(s.getState().loading).toBe(false);
  });

  it('실패하면 error 에 메시지를 담는다', async () => {
    const boom = Object.assign(new Error('x'), { code: 'network', message: '연결 실패' });
    const s = createStore({ client: fakeClient({ listTodos: vi.fn().mockRejectedValue(boom) }) });
    await s.loadBoard(3);
    expect(s.getState().error).toBe('연결 실패');
    expect(s.getState().loading).toBe(false);
  });

  it('적재 후 첫 카드를 선택한다', async () => {
    const s = createStore({ client: fakeClient() });
    await s.loadBoard(3);
    expect(s.getState().selected).toEqual({ statusKey: 'TODO', cardId: 1 });
  });
});

describe('선택 이동', () => {
  async function ready() {
    const s = createStore({ client: fakeClient() });
    await s.loadBoard(3);
    return s;
  }

  it('아래로 이동한다', async () => {
    const s = await ready();
    s.moveSelection(1);
    expect(s.getState().selected.cardId).toBe(2);
  });

  it('마지막 카드에서 아래로 가도 그대로다', async () => {
    const s = await ready();
    s.moveSelection(1); s.moveSelection(1);
    expect(s.getState().selected.cardId).toBe(2);
  });

  it('첫 카드에서 위로 가도 그대로다', async () => {
    const s = await ready();
    s.moveSelection(-1);
    expect(s.getState().selected.cardId).toBe(1);
  });

  it('옆 칸으로 이동하면 그 칸의 첫 카드를 고른다', async () => {
    const s = await ready();
    s.moveColumn(1);
    expect(s.getState().selected).toEqual({ statusKey: 'DONE', cardId: 3 });
  });

  it('빈 칸으로 이동하면 카드 없이 칸만 선택한다', async () => {
    const s = createStore({ client: fakeClient({ listTodos: vi.fn().mockResolvedValue([todos[0]]) }) });
    await s.loadBoard(3);
    s.moveColumn(1);
    expect(s.getState().selected).toEqual({ statusKey: 'DONE', cardId: null });
  });

  it('오른쪽 끝에서 더 가도 그대로다', async () => {
    const s = await ready();
    s.moveColumn(1); s.moveColumn(1);
    expect(s.getState().selected.statusKey).toBe('DONE');
  });

  async function readyWithThreeColumns() {
    const s = createStore({
      client: fakeClient({ listStatuses: vi.fn().mockResolvedValue(threeStatuses) }),
    });
    await s.loadBoard(3);
    return s;
  }

  it('접힌 칸을 건너뛰고 그 다음 칸을 선택한다', async () => {
    const s = await readyWithThreeColumns();
    s.toggleCollapse('DOING');
    s.moveColumn(1);
    expect(s.getState().selected).toEqual({ statusKey: 'DONE', cardId: 3 });
  });

  it('남은 칸이 전부 접혀 있으면 선택이 움직이지 않는다', async () => {
    const s = await readyWithThreeColumns();
    s.toggleCollapse('DOING');
    s.toggleCollapse('DONE');
    s.moveColumn(1);
    expect(s.getState().selected).toEqual({ statusKey: 'TODO', cardId: 1 });
  });
});

describe('카드 갱신', () => {
  async function ready() {
    const s = createStore({ client: fakeClient() });
    await s.loadBoard(3);
    return s;
  }

  it('같은 칸에서 내용만 바꾸면 카드의 인덱스가 유지된다', async () => {
    const s = await ready();
    s.upsertCard({ id: 1, summary: '첫째를 고쳤다', statusKey: 'TODO', priority: 'HIGH' });
    const list = s.getState().cardsByStatus.TODO;
    expect(list.map(c => c.id)).toEqual([1, 2]);
    expect(list[0].summary).toBe('첫째를 고쳤다');
  });

  it('다른 칸으로 옮기면 원래 칸에서 사라지고 새 칸에 나타난다', async () => {
    const s = await ready();
    s.upsertCard({ id: 1, summary: '첫째', statusKey: 'DONE', priority: 'HIGH' });
    const { cardsByStatus } = s.getState();
    expect(cardsByStatus.TODO.map(c => c.id)).toEqual([2]);
    expect(cardsByStatus.DONE.map(c => c.id)).toEqual([3, 1]);
  });
});

describe('완료 칸 정렬', () => {
  const doneStatuses = [
    { statusKey: 'TODO', name: '할 일', semanticStatus: 'TODO', position: 0 },
    { statusKey: 'DONE', name: '완료', semanticStatus: 'DONE', position: 1 },
  ];

  async function boardWith(sts, list) {
    const s = createStore({
      client: fakeClient({
        listStatuses: vi.fn().mockResolvedValue(sts),
        listTodos: vi.fn().mockResolvedValue(list),
      }),
    });
    await s.loadBoard(3);
    return s;
  }

  it('완료 칸이 completedAt 내림차순으로 정렬된다', async () => {
    const s = await boardWith(doneStatuses, [
      { id: 72, statusKey: 'DONE', summary: '가', completedAt: '2026-03-03' },
      { id: 1280, statusKey: 'DONE', summary: '나', completedAt: '2026-07-09' },
      { id: 575, statusKey: 'DONE', summary: '다', completedAt: '2026-04-30' },
    ]);
    expect(s.getState().cardsByStatus.DONE.map(c => c.id)).toEqual([1280, 575, 72]);
  });

  it('completedAt 이 없는 항목은 맨 뒤로 간다', async () => {
    const s = await boardWith(doneStatuses, [
      { id: 1, statusKey: 'DONE', summary: '시각이 아예 없다' },
      { id: 2, statusKey: 'DONE', summary: '완료일이 있다', completedAt: '2026-03-03' },
      { id: 3, statusKey: 'DONE', summary: '수정일만 있다', updatedAt: '2026-05-01' },
    ]);
    // 완료일이 없으면 수정일을 대신 쓰고, 둘 다 없는 것만 맨 뒤로 간다
    expect(s.getState().cardsByStatus.DONE.map(c => c.id)).toEqual([3, 2, 1]);
  });

  it('완료가 아닌 칸은 서버가 준 순서를 유지한다', async () => {
    // 할 일과 진행 중의 순서는 사용자가 웹에서 끌어 정한 것일 수 있다
    const s = await boardWith(doneStatuses, [
      { id: 10, statusKey: 'TODO', summary: '가', completedAt: '2026-01-01' },
      { id: 11, statusKey: 'TODO', summary: '나', completedAt: '2026-09-09' },
      { id: 12, statusKey: 'TODO', summary: '다' },
    ]);
    expect(s.getState().cardsByStatus.TODO.map(c => c.id)).toEqual([10, 11, 12]);
  });

  it('semanticStatus 가 DONE 인 커스텀 칸도 정렬된다', async () => {
    // 칸 이름과 statusKey 는 프로젝트마다 다르므로 semanticStatus 로 판별해야 한다
    const custom = [
      { statusKey: 'TODO', name: '할 일', semanticStatus: 'TODO', position: 0 },
      { statusKey: 'SHIPPED', name: '배포됨', semanticStatus: 'DONE', position: 1 },
    ];
    const s = await boardWith(custom, [
      { id: 1, statusKey: 'SHIPPED', summary: '가', completedAt: '2026-03-03' },
      { id: 2, statusKey: 'SHIPPED', summary: '나', completedAt: '2026-07-09' },
    ]);
    expect(s.getState().cardsByStatus.SHIPPED.map(c => c.id)).toEqual([2, 1]);
  });
});

describe('필터', () => {
  async function ready() {
    const s = createStore({ client: fakeClient() });
    await s.loadBoard(3);
    return s;
  }

  it('제목 검색은 대소문자를 가리지 않는다', async () => {
    const s = await ready();
    s.setFilter({ query: '첫' });
    expect(s.visibleCards('TODO').map(c => c.id)).toEqual([1]);
  });

  it('우선순위로 거른다', async () => {
    const s = await ready();
    s.setFilter({ priority: 'LOW' });
    expect(s.visibleCards('TODO').map(c => c.id)).toEqual([2]);
  });

  it('필터를 비우면 모두 보인다', async () => {
    const s = await ready();
    s.setFilter({ query: '첫' });
    s.setFilter({ query: '' });
    expect(s.visibleCards('TODO')).toHaveLength(2);
  });
});

describe('구독', () => {
  it('상태가 바뀌면 구독자를 부른다', async () => {
    const s = createStore({ client: fakeClient() });
    const fn = vi.fn();
    s.subscribe(fn);
    await s.loadBoard(3);
    expect(fn).toHaveBeenCalled();
  });

  it('구독을 해제하면 더 부르지 않는다', async () => {
    const s = createStore({ client: fakeClient() });
    const fn = vi.fn();
    s.subscribe(fn)();
    await s.loadBoard(3);
    expect(fn).not.toHaveBeenCalled();
  });
});

describe('setColumnOffset', () => {
  // 칸이 많아 화면 밖으로 밀려난 칸을 보이게 하려면 가로 위치를 옮겨야 한다.
  it('가로 위치를 옮긴다', () => {
    const s = createStore({ client: fakeClient() });
    s.setColumnOffset(2);
    expect(s.getState().columnOffset).toBe(2);
  });

  it('음수는 0 으로 잡아 준다', () => {
    const s = createStore({ client: fakeClient() });
    s.setColumnOffset(-3);
    expect(s.getState().columnOffset).toBe(0);
  });

  it('구독자에게 알린다', () => {
    const s = createStore({ client: fakeClient() });
    const fn = vi.fn();
    s.subscribe(fn);
    s.setColumnOffset(1);
    expect(fn).toHaveBeenCalled();
  });
});
