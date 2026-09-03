import { describe, it, expect } from 'vitest';
import { hitTest, columnAt } from '../src/input/hit.js';

const regions = [
  { kind: 'card', id: 1, x: 0, y: 3, w: 16, h: 5 },
  { kind: 'card', id: 2, x: 0, y: 8, w: 16, h: 5 },
  { kind: 'column-header', id: 'TODO', x: 0, y: 2, w: 16, h: 1 },
  { kind: 'card', id: 3, x: 18, y: 3, w: 16, h: 5 },
];

describe('hitTest', () => {
  it('영역 안의 좌표는 그 영역을 돌려준다', () => {
    expect(hitTest(regions, 5, 5)).toMatchObject({ kind: 'card', id: 1 });
  });

  it('왼쪽 위 모서리는 포함한다', () => {
    expect(hitTest(regions, 0, 3)).toMatchObject({ id: 1 });
  });

  it('오른쪽 아래 경계는 포함하지 않는다', () => {
    expect(hitTest(regions, 16, 3)).toBeNull();
    expect(hitTest(regions, 0, 8)).toMatchObject({ id: 2 });  // y=8 은 카드2의 시작
  });

  it('빈 곳은 null 을 돌려준다', () => {
    expect(hitTest(regions, 17, 5)).toBeNull();
    expect(hitTest(regions, 5, 40)).toBeNull();
  });

  it('칸 머리도 판정한다', () => {
    expect(hitTest(regions, 3, 2)).toMatchObject({ kind: 'column-header', id: 'TODO' });
  });

  it('영역이 없으면 null 이다', () => {
    expect(hitTest([], 0, 0)).toBeNull();
  });
});

describe('columnAt', () => {
  const layout = {
    mode: 'board',
    visibleColumns: ['TODO', 'IN_PROGRESS'],
    regions: [
      { kind: 'column-header', id: 'TODO', x: 0, y: 2, w: 16, h: 1 },
      { kind: 'column-header', id: 'IN_PROGRESS', x: 18, y: 2, w: 16, h: 1 },
    ],
  };

  it('칸의 x 범위 안이면 그 칸을 돌려준다 (세로 위치는 보지 않는다)', () => {
    expect(columnAt(layout, 5)).toBe('TODO');
    expect(columnAt(layout, 20)).toBe('IN_PROGRESS');
  });

  it('칸 사이 여백은 null 이다', () => {
    expect(columnAt(layout, 17)).toBeNull();
  });

  it('보드 오른쪽 바깥은 null 이다', () => {
    expect(columnAt(layout, 200)).toBeNull();
  });
});
