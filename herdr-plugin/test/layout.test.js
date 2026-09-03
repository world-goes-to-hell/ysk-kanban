import { describe, it, expect } from 'vitest';
import { computeLayout, pickMode, CARD_HEIGHT, DETAIL_WIDTH } from '../src/layout.js';

const statuses = [
  { statusKey: 'TODO', name: '할 일', color: '#2563EB', position: 0 },
  { statusKey: 'IN_PROGRESS', name: '진행 중', color: '#D97706', position: 1 },
  { statusKey: 'DONE', name: '완료', color: '#059669', position: 2 },
];

const cards = {
  TODO: [{ id: 1, summary: 'a' }, { id: 2, summary: 'b' }],
  IN_PROGRESS: [{ id: 3, summary: 'c' }],
  DONE: [],
};

const base = {
  columns: 214, rows: 48, statuses, cardsByStatus: cards,
  scroll: {}, collapsed: {}, columnOffset: 0,
};

describe('pickMode', () => {
  it('140열 이상이면 보드와 상세를 함께 보여준다', () => {
    expect(pickMode(214)).toBe('board-detail');
    expect(pickMode(140)).toBe('board-detail');
  });
  it('90에서 139열은 보드만 보여준다', () => {
    expect(pickMode(139)).toBe('board');
    expect(pickMode(90)).toBe('board');
  });
  it('90열 미만은 목록 모드다', () => {
    expect(pickMode(89)).toBe('list');
  });
});

describe('computeLayout — 보드+상세', () => {
  it('상세 패널 자리를 남긴다', () => {
    const l = computeLayout(base);
    expect(l.mode).toBe('board-detail');
    expect(l.detailX).toBe(214 - DETAIL_WIDTH);
  });

  it('카드 영역이 상세 패널을 침범하지 않는다', () => {
    const l = computeLayout(base);
    for (const r of l.regions.filter(r => r.kind === 'card')) {
      expect(r.x + r.w).toBeLessThanOrEqual(l.detailX);
    }
  });

  it('모든 카드에 영역을 만든다', () => {
    const ids = computeLayout(base).regions.filter(r => r.kind === 'card').map(r => r.id);
    expect(ids.sort()).toEqual([1, 2, 3]);
  });

  it('같은 칸의 카드는 CARD_HEIGHT 간격으로 쌓인다', () => {
    const [a, b] = computeLayout(base).regions.filter(r => r.kind === 'card' && [1, 2].includes(r.id));
    expect(b.y - a.y).toBe(CARD_HEIGHT);
    expect(a.x).toBe(b.x);
  });

  it('칸마다 머리 영역을 만든다', () => {
    const heads = computeLayout(base).regions.filter(r => r.kind === 'column-header');
    expect(heads.map(h => h.id)).toEqual(['TODO', 'IN_PROGRESS', 'DONE']);
  });

  it('영역이 서로 겹치지 않는다', () => {
    const rs = computeLayout(base).regions;
    for (let i = 0; i < rs.length; i++) {
      for (let j = i + 1; j < rs.length; j++) {
        expect(overlaps(rs[i], rs[j])).toBe(false);
      }
    }
  });
});

describe('computeLayout — 스크롤과 접힘', () => {
  it('스크롤한 만큼 카드가 위로 올라간다', () => {
    const l = computeLayout({ ...base, scroll: { TODO: 1 } });
    const first = l.regions.find(r => r.kind === 'card' && r.id === 2);
    const head = l.regions.find(r => r.kind === 'column-header' && r.id === 'TODO');
    expect(first.y).toBe(head.y + 1);
  });

  it('스크롤로 화면 밖에 나간 카드는 영역을 만들지 않는다', () => {
    const l = computeLayout({ ...base, scroll: { TODO: 1 } });
    expect(l.regions.some(r => r.kind === 'card' && r.id === 1)).toBe(false);
  });

  it('접힌 칸은 머리만 남기고 카드 영역을 만들지 않는다', () => {
    const l = computeLayout({ ...base, collapsed: { TODO: true } });
    expect(l.regions.some(r => r.kind === 'card' && [1, 2].includes(r.id))).toBe(false);
    expect(l.regions.some(r => r.kind === 'column-header' && r.id === 'TODO')).toBe(true);
  });
});

describe('computeLayout — 좁은 화면', () => {
  it('폭이 모자라면 보이는 칸 수를 줄인다', () => {
    const l = computeLayout({ ...base, columns: 100 });
    expect(l.visibleColumns.length).toBeLessThan(3);
    expect(l.mode).toBe('board');
  });

  it('columnOffset 만큼 오른쪽 칸부터 보여준다', () => {
    const l = computeLayout({ ...base, columns: 100, columnOffset: 1 });
    expect(l.visibleColumns[0]).toBe('IN_PROGRESS');
  });

  it('목록 모드에서는 모든 카드가 같은 x 에 놓인다', () => {
    const l = computeLayout({ ...base, columns: 80 });
    expect(l.mode).toBe('list');
    const xs = new Set(l.regions.filter(r => r.kind === 'card').map(r => r.x));
    expect(xs.size).toBe(1);
  });
});

describe('computeLayout — 경계', () => {
  it('카드가 하나도 없어도 예외를 던지지 않는다', () => {
    const empty = { TODO: [], IN_PROGRESS: [], DONE: [] };
    expect(() => computeLayout({ ...base, cardsByStatus: empty })).not.toThrow();
  });

  it('칸이 하나도 없어도 예외를 던지지 않는다', () => {
    expect(() => computeLayout({ ...base, statuses: [], cardsByStatus: {} })).not.toThrow();
  });

  it('행이 매우 적으면 카드를 하나도 배치하지 않을 수 있다', () => {
    const l = computeLayout({ ...base, rows: 5 });
    expect(l.regions.filter(r => r.kind === 'card').length).toBeLessThanOrEqual(1);
  });
});

function overlaps(a, b) {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}
