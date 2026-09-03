import { describe, it, expect, vi } from 'vitest';
import { parseMouse, enableMouse, disableMouse, createMouseHandler } from '../src/input/mouse.js';

describe('parseMouse', () => {
  it('누름을 해석한다', () => {
    expect(parseMouse('\x1b[<0;10;5M')).toEqual({ button: 0, col: 9, row: 4, kind: 'down' });
  });

  it('뗌을 해석한다', () => {
    expect(parseMouse('\x1b[<0;10;5m')).toEqual({ button: 0, col: 9, row: 4, kind: 'up' });
  });

  it('SGR 의 1 기준 좌표를 0 기준으로 바꾼다', () => {
    expect(parseMouse('\x1b[<0;1;1M')).toMatchObject({ col: 0, row: 0 });
  });

  it('드래그(버튼 32 이상)를 move 로 본다', () => {
    expect(parseMouse('\x1b[<32;10;5M')).toMatchObject({ kind: 'move' });
  });

  it('휠 위는 wheel-up 이다', () => {
    expect(parseMouse('\x1b[<64;10;5M')).toMatchObject({ kind: 'wheel-up' });
  });

  it('휠 아래는 wheel-down 이다', () => {
    expect(parseMouse('\x1b[<65;10;5M')).toMatchObject({ kind: 'wheel-down' });
  });

  it('마우스가 아닌 입력은 null 이다', () => {
    expect(parseMouse('j')).toBeNull();
    expect(parseMouse('\x1b[A')).toBeNull();
  });
});

describe('enable/disableMouse', () => {
  it('활성화 시퀀스를 쓴다', () => {
    const stdout = { write: vi.fn() };
    enableMouse(stdout);
    const written = stdout.write.mock.calls.map(c => c[0]).join('');
    expect(written).toContain('\x1b[?1000h');
    expect(written).toContain('\x1b[?1002h');
    expect(written).toContain('\x1b[?1006h');
  });

  it('비활성화는 활성화의 역순으로 끈다', () => {
    const stdout = { write: vi.fn() };
    disableMouse(stdout);
    const written = stdout.write.mock.calls.map(c => c[0]).join('');
    expect(written).toContain('\x1b[?1000l');
    expect(written).toContain('\x1b[?1002l');
    expect(written).toContain('\x1b[?1006l');
  });

  // 켠 모드를 하나라도 끄지 못하면 그 터미널이 마우스 보고 상태로 남아
  // 클릭과 드래그 선택이 먹지 않는다. 짝이 맞는지 직접 확인한다.
  it('켠 모드를 하나도 빠뜨리지 않고 끈다', () => {
    const written = (fn) => {
      const stdout = { write: vi.fn() };
      fn(stdout);
      return stdout.write.mock.calls.map(c => c[0]).join('');
    };
    const modes = (text) => [...text.matchAll(/\x1b\[\?(\d+)[hl]/g)].map(m => m[1]).sort();

    const on = modes(written(enableMouse));
    expect(on.length).toBeGreaterThan(0);
    expect(modes(written(disableMouse))).toEqual(on);
  });
});

const layout = {
  mode: 'board',
  visibleColumns: ['TODO', 'DONE'],
  regions: [
    { kind: 'column-header', id: 'TODO', x: 0, y: 2, w: 16, h: 1 },
    { kind: 'column-header', id: 'DONE', x: 18, y: 2, w: 16, h: 1 },
    { kind: 'card', id: 1, x: 0, y: 3, w: 16, h: 5 },
  ],
};

function spyBag(over = {}) {
  return {
    onClick: vi.fn(), onDoubleClick: vi.fn(), onWheel: vi.fn(),
    onDragStart: vi.fn(), onDragMove: vi.fn(), onDragEnd: vi.fn(),
    ...over,
  };
}

function handler(over = {}) {
  const spies = spyBag(over);
  return { handle: createMouseHandler({ getLayout: () => layout, ...spies }), spies };
}

const down = (col, row) => ({ kind: 'down', button: 0, col, row });
const move = (col, row) => ({ kind: 'move', button: 0, col, row });
const up = (col, row) => ({ kind: 'up', button: 0, col, row });

describe('클릭과 휠', () => {
  it('카드를 누르고 그 자리에서 떼면 클릭이다', () => {
    const { handle, spies } = handler();
    handle(down(5, 5));
    handle(up(5, 5));
    expect(spies.onClick).toHaveBeenCalledWith(expect.objectContaining({ kind: 'card', id: 1 }));
  });

  it('짧은 시간에 두 번 누르면 더블클릭이다', () => {
    let clock = 1000;
    const spies = spyBag();
    const handle = createMouseHandler({ getLayout: () => layout, now: () => clock, ...spies });

    handle(down(5, 5));
    handle(up(5, 5));
    clock += 100;
    handle(down(5, 5));
    handle(up(5, 5));

    expect(spies.onDoubleClick).toHaveBeenCalledTimes(1);
  });

  it('사이가 길면 더블클릭이 아니다', () => {
    let clock = 1000;
    const spies = spyBag();
    const handle = createMouseHandler({ getLayout: () => layout, now: () => clock, ...spies });

    handle(down(5, 5));
    handle(up(5, 5));
    clock += 5000;
    handle(down(5, 5));
    handle(up(5, 5));

    expect(spies.onDoubleClick).not.toHaveBeenCalled();
    expect(spies.onClick).toHaveBeenCalledTimes(2);
  });

  it('누른 곳과 뗀 곳이 다르면 클릭이 아니다', () => {
    const { handle, spies } = handler();
    handle(down(5, 5));
    handle(up(5, 2));
    expect(spies.onClick).not.toHaveBeenCalled();
  });

  it('칸 머리를 누르면 그 칸을 알려준다', () => {
    const { handle, spies } = handler();
    handle(down(5, 2));
    handle(up(5, 2));
    expect(spies.onClick).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'column-header', id: 'TODO' }));
  });

  it('휠 위는 그 칸을 -1 로 굴린다', () => {
    const { handle, spies } = handler();
    handle({ kind: 'wheel-up', button: 0, col: 5, row: 9 });
    expect(spies.onWheel).toHaveBeenCalledWith('TODO', -1);
  });

  it('휠 아래는 그 칸을 +1 로 굴린다', () => {
    const { handle, spies } = handler();
    handle({ kind: 'wheel-down', button: 0, col: 20, row: 9 });
    expect(spies.onWheel).toHaveBeenCalledWith('DONE', 1);
  });

  it('칸 밖에서 굴리면 아무것도 하지 않는다', () => {
    const { handle, spies } = handler();
    handle({ kind: 'wheel-up', button: 0, col: 17, row: 9 });
    expect(spies.onWheel).not.toHaveBeenCalled();
  });

  it('레이아웃이 아직 없으면 아무것도 하지 않는다', () => {
    const spies = spyBag();
    const handle = createMouseHandler({ getLayout: () => null, ...spies });
    expect(() => {
      handle(down(5, 5));
      handle(up(5, 5));
    }).not.toThrow();
    expect(spies.onClick).not.toHaveBeenCalled();
  });
});

describe('드래그', () => {
  it('누르고 움직이면 드래그가 시작된다', () => {
    const { handle, spies } = handler();
    handle(down(5, 5));
    handle(move(10, 5));
    expect(spies.onDragStart).toHaveBeenCalledWith(1);
  });

  it('움직이지 않고 떼면 클릭이다', () => {
    const { handle, spies } = handler();
    handle(down(5, 5));
    handle(up(5, 5));
    expect(spies.onClick).toHaveBeenCalled();
    expect(spies.onDragStart).not.toHaveBeenCalled();
  });

  it('다른 칸에 떼면 그 칸을 알려준다', () => {
    const { handle, spies } = handler();
    handle(down(5, 5));
    handle(move(20, 5));
    handle(up(20, 5));
    expect(spies.onDragEnd).toHaveBeenCalledWith(1, 'DONE');
  });

  it('칸 밖에 떼면 대상이 null 이다', () => {
    const { handle, spies } = handler();
    handle(down(5, 5));
    handle(move(17, 5));
    handle(up(17, 5));
    expect(spies.onDragEnd).toHaveBeenCalledWith(1, null);
  });

  it('드래그 중에는 지나는 칸을 계속 알려준다', () => {
    const { handle, spies } = handler();
    handle(down(5, 5));
    handle(move(10, 5));
    handle(move(20, 5));
    expect(spies.onDragMove).toHaveBeenLastCalledWith('DONE', 20, 5);
  });

  it('빈 곳에서 시작한 드래그는 무시한다', () => {
    const { handle, spies } = handler();
    handle(down(17, 30));
    handle(move(20, 30));
    handle(up(20, 30));
    expect(spies.onDragStart).not.toHaveBeenCalled();
    expect(spies.onDragEnd).not.toHaveBeenCalled();
  });

  it('칸 머리는 드래그하지 않는다', () => {
    const { handle, spies } = handler();
    handle(down(5, 2));
    handle(move(20, 2));
    expect(spies.onDragStart).not.toHaveBeenCalled();
  });

  it('연속 드래그가 서로 섞이지 않는다', () => {
    const { handle, spies } = handler();
    handle(down(5, 5));
    handle(move(20, 5));
    handle(up(20, 5));
    handle(down(5, 5));
    handle(up(5, 5));
    expect(spies.onDragEnd).toHaveBeenCalledTimes(1);
    expect(spies.onClick).toHaveBeenCalledTimes(1);
  });

  it('한 칸만 움직인 것은 드래그로 보지 않는다', () => {
    const { handle, spies } = handler();
    handle(down(5, 5));
    handle(move(6, 5));
    handle(up(6, 5));
    expect(spies.onDragStart).not.toHaveBeenCalled();
    expect(spies.onClick).toHaveBeenCalled();
  });
});
