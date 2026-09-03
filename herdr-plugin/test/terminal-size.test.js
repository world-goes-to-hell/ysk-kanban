import { describe, it, expect } from 'vitest';
import {
  readSize, parsePaneSize, resolveSize,
  FALLBACK_COLUMNS, FALLBACK_ROWS, CHROME_COLUMNS,
} from '../src/ui/useTerminalSize.js';

describe('readSize', () => {
  it('stdout 에 값이 있으면 그 값을 돌려준다', () => {
    expect(readSize({ columns: 214, rows: 48 })).toEqual({ columns: 214, rows: 48 });
  });

  it('columns 가 undefined 면 80 으로 폴백한다', () => {
    expect(readSize({ rows: 48 })).toEqual({ columns: FALLBACK_COLUMNS, rows: 48 });
  });

  it('rows 가 0 이면 24 로 폴백한다', () => {
    expect(readSize({ columns: 214, rows: 0 })).toEqual({ columns: 214, rows: FALLBACK_ROWS });
  });

  it('stdout 자체가 없으면 둘 다 폴백한다', () => {
    expect(readSize(undefined)).toEqual({ columns: FALLBACK_COLUMNS, rows: FALLBACK_ROWS });
  });
});

describe('parsePaneSize', () => {
  const layout = () => JSON.stringify({
    id: 'cli:pane:layout',
    result: {
      layout: {
        area: { height: 48, width: 214, x: 24, y: 1 },
        panes: [
          { focused: true, pane_id: 'w1:p1', rect: { height: 48, width: 107, x: 24, y: 1 } },
          { focused: false, pane_id: 'w1:p2', rect: { height: 24, width: 107, x: 131, y: 1 } },
        ],
      },
    },
  });

  it('정상 JSON 에서 width/height 를 뽑는다', () => {
    expect(parsePaneSize(layout())).toEqual({ columns: 214, rows: 48 });
  });

  it('깨진 JSON 이면 null 을 돌려준다', () => {
    expect(parsePaneSize('이건 JSON 이 아니다')).toBeNull();
  });

  it('area 가 없으면 null 을 돌려준다', () => {
    expect(parsePaneSize(JSON.stringify({ result: { layout: {} } }))).toBeNull();
  });

  it('width 가 0 이거나 음수면 null 을 돌려준다', () => {
    const withArea = (area) => JSON.stringify({ result: { layout: { area } } });
    expect(parsePaneSize(withArea({ width: 0, height: 48 }))).toBeNull();
    expect(parsePaneSize(withArea({ width: -1, height: 48 }))).toBeNull();
    expect(parsePaneSize(withArea({ width: 214, height: 0 }))).toBeNull();
  });

  // area 는 탭 전체 영역이다. 분할된 pane 은 그보다 작으므로 자기 rect 를 써야 한다.
  it('pane id 를 주면 탭 전체가 아니라 그 pane 의 크기를 돌려준다', () => {
    expect(parsePaneSize(layout(), 'w1:p2')).toEqual({ columns: 107, rows: 24 });
  });

  it('pane id 가 목록에 없으면 탭 전체 크기로 떨어진다', () => {
    expect(parsePaneSize(layout(), 'w1:p9')).toEqual({ columns: 214, rows: 48 });
  });
});

describe('resolveSize', () => {
  const badStdout = { columns: 50, rows: 46 };

  it('stdout 이 실제보다 좁으면 herdr 가 알려 준 폭을 쓴다', () => {
    const size = resolveSize({
      paneId: 'w1:p2',
      queryPane: () => ({ columns: 214, rows: 48 }),
      stdout: badStdout,
    });
    // pane 테두리가 먹는 폭을 빼고 쓴다. 세로는 stdout 을 그대로 따른다.
    expect(size).toEqual({ columns: 214 - CHROME_COLUMNS, rows: 46 });
  });

  it('herdr 폭이 조금 더 커도 stdout 을 넘지 않는다', () => {
    // 넘겨 잡으면 줄이 접혀 세로로 넘친다. 넓히는 쪽은 늘 보수적으로 간다.
    const size = resolveSize({
      paneId: 'w1:p2',
      queryPane: () => ({ columns: 214, rows: 48 }),
      stdout: { columns: 213, rows: 48 },
    });
    expect(size).toEqual({ columns: 213, rows: 48 });
  });

  it('stdout 이 이미 정확하면 herdr 때문에 넓어지지 않는다', () => {
    const size = resolveSize({
      paneId: 'w1:p2',
      queryPane: () => ({ columns: 107, rows: 48 }),
      stdout: { columns: 104, rows: 46 },
    });
    expect(size).toEqual({ columns: 104, rows: 46 });
  });

  it('세로는 herdr 값을 쓰지 않는다 — 그러면 화면이 밀려 올라간다', () => {
    const size = resolveSize({
      paneId: 'w1:p2',
      queryPane: () => ({ columns: 169, rows: 48 }),
      stdout: { columns: 166, rows: 46 },
    });
    expect(size.rows).toBe(46);
  });

  it('queryPane 이 null 을 주면 stdout 값으로 폴백한다', () => {
    const size = resolveSize({ paneId: 'w1:p2', queryPane: () => null, stdout: badStdout });
    expect(size).toEqual({ columns: 50, rows: 46 });
  });

  it('paneId 가 없으면 queryPane 을 부르지 않는다', () => {
    let calls = 0;
    const size = resolveSize({
      paneId: undefined,
      queryPane: () => { calls += 1; return { columns: 214, rows: 48 }; },
      stdout: { columns: 104, rows: 22 },
    });
    expect(calls).toBe(0);
    expect(size).toEqual({ columns: 104, rows: 22 });
  });

  it('둘 다 없으면 80x24 로 떨어진다', () => {
    expect(resolveSize({})).toEqual({ columns: FALLBACK_COLUMNS, rows: FALLBACK_ROWS });
  });
});
