// herdr-plugin/src/input/mouse.js
import { hitTest, columnAt } from './hit.js';

// 1000: 누름·뗌 보고, 1002: 버튼을 누른 채 움직일 때도 보고, 1006: SGR 확장 좌표.
// SGR 을 켜야 좌표가 223 칸을 넘어도 정확하다. 넓은 pane 에서는 필수다.
const ON = '\x1b[?1000h\x1b[?1002h\x1b[?1006h';

// 켠 순서의 역순으로 끈다.
const OFF = '\x1b[?1006l\x1b[?1002l\x1b[?1000l';

const SGR = /\x1b\[<(\d+);(\d+);(\d+)([Mm])/;

const WHEEL_UP = 64;
const WHEEL_DOWN = 65;
const MOTION_FLAG = 32;

const DOUBLE_CLICK_MS = 400;
const DRAG_THRESHOLD = 1; // 한 칸까지는 손떨림으로 보고 클릭으로 남긴다

export function enableMouse(stdout) {
  stdout.write(ON);
}

/**
 * 마우스 보고를 끈다.
 *
 * 이걸 부르지 않고 종료하면 터미널이 마우스 보고 상태로 남아 클릭과 드래그 선택이
 * 먹지 않는다. 사용자가 터미널을 다시 띄워야 하므로, 어떤 경로로 끝나든 반드시 부른다.
 */
export function disableMouse(stdout) {
  stdout.write(OFF);
}

/**
 * SGR 마우스 시퀀스를 해석한다.
 * SGR 은 좌표를 1부터 세므로 화면 좌표계(0부터)로 맞춰 돌려준다.
 */
export function parseMouse(data) {
  const m = SGR.exec(data);
  if (!m) return null;

  const button = Number(m[1]);
  const col = Number(m[2]) - 1;
  const row = Number(m[3]) - 1;
  const released = m[4] === 'm';

  let kind;
  if (button === WHEEL_UP) kind = 'wheel-up';
  else if (button === WHEEL_DOWN) kind = 'wheel-down';
  else if (released) kind = 'up';
  else if (button >= MOTION_FLAG) kind = 'move';
  else kind = 'down';

  return { button: button & 3, col, row, kind };
}

/**
 * 마우스 이벤트를 화면 동작으로 옮긴다.
 * 누름·이동·뗌을 추적해 클릭과 드래그를 구분한다.
 *
 * 좌표 판정은 layout.js 가 만든 regions 에만 의존한다. 그리는 쪽과 같은 표를 보므로
 * 보이는 곳과 눌리는 곳이 어긋나지 않는다.
 */
export function createMouseHandler({
  getLayout, onClick, onDoubleClick, onWheel,
  onDragStart, onDragMove, onDragEnd,
  now = () => Date.now(),
}) {
  let press = null; // { region, col, row, dragging }
  let lastClick = { id: null, at: 0 };

  const handleWheel = (layout, ev) => {
    const statusKey = columnAt(layout, ev.col);
    if (statusKey) onWheel(statusKey, ev.kind === 'wheel-up' ? -1 : 1);
  };

  const handleMove = (layout, ev) => {
    if (!press || press.region.kind !== 'card') return;

    const moved = Math.abs(ev.col - press.col) + Math.abs(ev.row - press.row);
    if (!press.dragging && moved > DRAG_THRESHOLD) {
      press = { ...press, dragging: true };
      onDragStart(press.region.id);
    }
    if (press.dragging) onDragMove(columnAt(layout, ev.col), ev.col, ev.row);
  };

  const handleUp = (layout, ev) => {
    if (!press) return;
    const held = press;
    press = null;

    if (held.dragging) {
      onDragEnd(held.region.id, columnAt(layout, ev.col));
      return;
    }

    // 누른 영역에서 뗀 것만 클릭으로 본다. 도중에 다른 영역으로 벗어났다면 취소다.
    const region = hitTest(layout.regions, ev.col, ev.row);
    if (!region || region.id !== held.region.id) return;

    const at = now();
    const isDouble = lastClick.id === region.id && at - lastClick.at < DOUBLE_CLICK_MS;
    lastClick = { id: region.id, at };

    if (isDouble) onDoubleClick(region);
    else onClick(region);
  };

  return function handle(ev) {
    const layout = getLayout();
    if (!layout) return;

    if (ev.kind === 'wheel-up' || ev.kind === 'wheel-down') return handleWheel(layout, ev);

    if (ev.kind === 'down') {
      const region = hitTest(layout.regions, ev.col, ev.row);
      press = region ? { region, col: ev.col, row: ev.row, dragging: false } : null;
      return;
    }

    if (ev.kind === 'move') return handleMove(layout, ev);
    if (ev.kind === 'up') return handleUp(layout, ev);
  };
}
