// herdr-plugin/src/layout.js

export const CARD_HEIGHT = 5;
export const COLUMN_GAP = 2;
export const MIN_COLUMN_WIDTH = 14;
export const PREFERRED_COLUMN_WIDTH = 36;
export const DETAIL_WIDTH = 40;

const HEADER_ROWS = 2;   // 상단 제목줄 + 구분선
const FOOTER_ROWS = 1;   // 하단 키 안내
const COLUMN_HEAD_ROWS = 1;

/** pane 폭으로 표시 모드를 정한다. */
export function pickMode(columns) {
  if (columns >= 140) return 'board-detail';
  if (columns >= 90) return 'board';
  return 'list';
}

/**
 * 화면 배치를 계산한다. 이 결과가 렌더링과 마우스 판정의 단일 출처다.
 * 반환하는 좌표는 pane 좌상단을 (0, 0) 으로 하는 셀 단위다.
 */
export function computeLayout({
  columns, rows, statuses, cardsByStatus,
  scroll = {}, collapsed = {}, columnOffset = 0,
}) {
  const mode = pickMode(columns);
  const detailX = mode === 'board-detail' ? columns - DETAIL_WIDTH : columns;
  const boardWidth = detailX;
  const bodyTop = HEADER_ROWS;
  const bodyHeight = Math.max(0, rows - HEADER_ROWS - FOOTER_ROWS);

  const regions = [{ kind: 'project-name', id: 'project', x: 1, y: 0, w: 24, h: 1 }];

  if (mode === 'list') {
    return { mode, detailX, visibleColumns: statuses.map(s => s.statusKey),
             regions: [...regions, ...listRegions({ statuses, cardsByStatus, bodyTop, bodyHeight, boardWidth })] };
  }

  const { visibleColumns, columnWidth } = fitColumns({ statuses, boardWidth, columnOffset });

  visibleColumns.forEach((statusKey, i) => {
    const x = i * (columnWidth + COLUMN_GAP);
    regions.push({ kind: 'column-header', id: statusKey, x, y: bodyTop, w: columnWidth, h: COLUMN_HEAD_ROWS });

    if (collapsed[statusKey]) return;

    const cardTop = bodyTop + COLUMN_HEAD_ROWS;
    const room = bodyHeight - COLUMN_HEAD_ROWS;
    const skipped = scroll[statusKey] ?? 0;
    const cards = (cardsByStatus[statusKey] ?? []).slice(skipped);

    cards.forEach((card, n) => {
      const y = cardTop + n * CARD_HEIGHT;
      if (y + CARD_HEIGHT > bodyTop + bodyHeight) return;      // 아래로 넘치면 버린다
      if (room < CARD_HEIGHT) return;                          // 애초에 자리가 없다
      regions.push({ kind: 'card', id: card.id, x, y, w: columnWidth, h: CARD_HEIGHT });
    });
  });

  return { mode, detailX, visibleColumns, regions };
}

/**
 * 보드 폭에 몇 개의 칸이 들어가는지, 칸 하나의 폭은 얼마인지 정한다.
 *
 * 칸의 개수는 MIN_COLUMN_WIDTH 가 아니라 PREFERRED_COLUMN_WIDTH 로 센다.
 * 최소 폭으로 세면 좁은 pane 에도 모든 칸이 '들어가기는' 하므로 칸이 줄지 않고,
 * 카드 제목이 몇 글자 만에 잘려 읽을 수 없게 된다. 폭이 모자랄 때는 칸을 좁히는 대신
 * 개수를 줄이고 columnOffset 으로 옆 칸을 넘겨 보는 것이 이 화면의 규칙이다.
 *
 * 개수를 정한 뒤 실제 폭은 남은 보드 폭을 균등하게 나눠 갖는다. 그래야 오른쪽에
 * 빈 띠가 남지 않는다. MIN_COLUMN_WIDTH 는 그렇게 나눈 폭이 지나치게 좁아지지 않도록
 * 막는 바닥값이다.
 */
function fitColumns({ statuses, boardWidth, columnOffset }) {
  if (statuses.length === 0) return { visibleColumns: [], columnWidth: MIN_COLUMN_WIDTH };

  const perColumn = PREFERRED_COLUMN_WIDTH + COLUMN_GAP;
  const fits = Math.max(1, Math.floor((boardWidth + COLUMN_GAP) / perColumn));
  const rest = statuses.slice(columnOffset);
  const shown = rest.slice(0, Math.min(fits, rest.length));

  const width = shown.length === 0
    ? MIN_COLUMN_WIDTH
    : Math.floor((boardWidth - COLUMN_GAP * (shown.length - 1)) / shown.length);

  return { visibleColumns: shown.map(s => s.statusKey), columnWidth: Math.max(MIN_COLUMN_WIDTH, width) };
}

/** 목록 모드 — 칸을 나누지 않고 한 줄에 하나씩 쌓는다. */
function listRegions({ statuses, cardsByStatus, bodyTop, bodyHeight, boardWidth }) {
  const out = [];
  let y = bodyTop;

  for (const s of statuses) {
    for (const card of cardsByStatus[s.statusKey] ?? []) {
      if (y >= bodyTop + bodyHeight) return out;
      out.push({ kind: 'card', id: card.id, x: 0, y, w: boardWidth, h: 1 });
      y += 1;
    }
  }
  return out;
}
