import { describe, it, expect, vi } from 'vitest';
import { createMutations } from '../src/mutations.js';
import { createStore } from '../src/store.js';

const statuses = [
  { statusKey: 'TODO', name: '할 일', semanticStatus: 'TODO', position: 0 },
  { statusKey: 'DONE', name: '완료', semanticStatus: 'DONE', position: 1 },
];
const todos = [{ id: 1, summary: '일감', statusKey: 'TODO', priority: 'HIGH' }];

function setup(over = {}) {
  const client = {
    listProjects: vi.fn().mockResolvedValue([{ id: 3, name: 'P' }]),
    listStatuses: vi.fn().mockResolvedValue(statuses),
    listTodos: vi.fn().mockResolvedValue(todos),
    listSubtasks: vi.fn().mockResolvedValue([]),
    changeStatus: vi.fn().mockResolvedValue({ id: 1, summary: '일감', statusKey: 'DONE' }),
    ...over,
  };
  const store = createStore({ client });
  return { store, client, mutations: createMutations({ store, client }) };
}

describe('상태 변경', () => {
  it('요청 전에 화면을 먼저 바꾼다', async () => {
    const { store, mutations, client } = setup();
    await store.loadBoard(3);

    let moved = false;
    client.changeStatus.mockImplementation(async () => {
      moved = store.getState().cardsByStatus.DONE.some(c => c.id === 1);
      return { id: 1, summary: '일감', statusKey: 'DONE' };
    });

    await mutations.changeStatus(1, 'DONE', { confirmSubtasks: true });
    expect(moved).toBe(true);
  });

  it('성공하면 서버 응답으로 마무리한다', async () => {
    const { store, mutations } = setup();
    await store.loadBoard(3);
    await mutations.changeStatus(1, 'DONE', { confirmSubtasks: true });
    expect(store.getState().cardsByStatus.DONE.map(c => c.id)).toEqual([1]);
    expect(store.getState().cardsByStatus.TODO).toEqual([]);
  });

  it('실패하면 원래 칸으로 되돌린다', async () => {
    const { store, mutations } = setup({
      changeStatus: vi.fn().mockRejectedValue(Object.assign(new Error('x'), { message: '서버 오류' })),
    });
    await store.loadBoard(3);
    const r = await mutations.changeStatus(1, 'DONE', { confirmSubtasks: true });

    expect(r).toBe('failed');
    expect(store.getState().cardsByStatus.TODO.map(c => c.id)).toEqual([1]);
    expect(store.getState().cardsByStatus.DONE).toEqual([]);
    expect(store.getState().error).toBe('서버 오류');
  });

  it('완료 칸으로 옮길 때 미완료 하위가 있으면 확인을 요구한다', async () => {
    const { store, mutations, client } = setup({
      listSubtasks: vi.fn().mockResolvedValue([
        { id: 11, statusKey: 'DONE' }, { id: 12, statusKey: 'TODO' },
      ]),
    });
    await store.loadBoard(3);
    const r = await mutations.changeStatus(1, 'DONE', { confirmSubtasks: false });

    expect(r).toBe('needs-confirm');
    expect(client.changeStatus).not.toHaveBeenCalled();
    expect(store.getState().cardsByStatus.TODO.map(c => c.id)).toEqual([1]);
  });

  it('확인을 받으면 그대로 진행한다', async () => {
    const { store, mutations, client } = setup({
      listSubtasks: vi.fn().mockResolvedValue([{ id: 12, statusKey: 'TODO' }]),
    });
    await store.loadBoard(3);
    const r = await mutations.changeStatus(1, 'DONE', { confirmSubtasks: true });
    expect(r).toBe('done');
    expect(client.changeStatus).toHaveBeenCalledWith(1, 'DONE');
  });

  it('완료가 아닌 칸으로 옮길 때는 하위를 확인하지 않는다', async () => {
    const { store, mutations, client } = setup();
    await store.loadBoard(3);
    await mutations.changeStatus(1, 'TODO', { confirmSubtasks: false });
    expect(client.listSubtasks).not.toHaveBeenCalled();
  });
});
