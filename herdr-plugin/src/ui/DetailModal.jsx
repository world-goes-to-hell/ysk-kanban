import { Box, Text } from 'ink';
import { truncate, wrap, padTo } from '../text.js';

const PRIORITY_LABEL = { HIGH: '높음', MEDIUM: '보통', LOW: '낮음' };
const MARK_WIDTH = 3;

/** 이 폭 아래로는 70% 를 떼면 아무것도 담지 못하므로 화면을 거의 다 쓴다. */
const NARROW = 90;
// 크기를 받지 못했을 때 쓰는 값. 없으면 NaN 이 번져 본문이 0 줄로 접히고
// 글자가 … 하나만 남아 팝업이 뒤를 덮지 못한다.
const DEFAULT_COLUMNS = 80;
const DEFAULT_ROWS = 24;
const MAX_WIDTH = 100;
/** 테두리가 차지하는 좌우 2 칸 */
const BORDER = 2;
/** 테두리 2 칸에 좌우 여백 1 칸씩을 더한 값 */
const FRAME = 4;
/** 고정으로 쓰는 줄: 테두리 위아래 2, 제목 1, 구분선 1, 안내 1 */
const CHROME_ROWS = 5;

/** 화면 가운데 뜨는 팝업의 폭. 넓은 화면에서는 70%, 좁은 화면에서는 거의 전부를 쓴다. */
export function modalWidth(columns) {
  const c = Number.isFinite(columns) ? columns : DEFAULT_COLUMNS;
  if (c < NARROW) return Math.max(20, c - 4);
  return Math.min(MAX_WIDTH, Math.round(c * 0.7));
}

/** 팝업의 높이. 화면의 약 80% 를 쓰되 위아래로 한 줄씩은 남긴다. */
export function modalHeight(rows) {
  const r = Number.isFinite(rows) ? rows : DEFAULT_ROWS;
  return Math.max(CHROME_ROWS + 1, Math.min(r - 2, Math.round(r * 0.8)));
}

function fieldsOf(card, statusName) {
  return [
    ['상태', statusName ?? card.statusKey ?? '-'],
    ['우선', PRIORITY_LABEL[card.priority] ?? '-'],
    ['마감', card.dueDate ?? '-'],
    ['담당', (card.assignees ?? []).map(a => a.username).join(', ') || '-'],
  ];
}

/**
 * 상세 내용을 줄 배열로 만든다. 제목은 팝업이 고정 머리로 따로 그리므로 여기에 없다.
 *
 * 잘라내지 않고 전부 담는다. 넘치는 것은 세로 스크롤이 맡으므로,
 * 이 배열의 길이가 곧 App 이 스크롤 한계를 정하는 근거가 된다.
 */
export function buildDetailLines({ card, subtasks = [], comments = [], statusName, width }) {
  if (!card) return ['선택된 일감이 없습니다'];

  const w = Math.max(4, width);
  const lines = [];
  const separate = () => lines.push('─'.repeat(w));

  for (const [label, value] of fieldsOf(card, statusName)) {
    lines.push(...wrap(`${label}  ${value}`, w));
  }

  if (card.description) {
    separate();
    lines.push(...wrap(card.description, w));
  }

  if (subtasks.length > 0) {
    separate();
    const done = subtasks.filter(s => (s.statusKey ?? s.status) === 'DONE').length;
    lines.push(`하위 ${done}/${subtasks.length}`);
    for (const s of subtasks) {
      const mark = (s.statusKey ?? s.status) === 'DONE' ? ' v ' : ' o ';
      lines.push(mark + truncate(s.summary ?? '', Math.max(1, w - MARK_WIDTH)));
    }
  }

  if (comments.length > 0) {
    separate();
    lines.push(`댓글 ${comments.length}`);
    for (const c of comments) {
      const who = c.author?.username ?? '알 수 없음';
      const when = (c.createdAt ?? '').slice(0, 10);
      lines.push(truncate(`${who}  ${when}`.trim(), w));
      lines.push(...wrap(c.content ?? '', w));
    }
  }

  return lines;
}

/**
 * 상세를 화면 가운데 넓게 펼쳐 보여준다. 오른쪽 패널은 요약이고 이쪽은 전문이다.
 *
 * 스크롤 위치는 App 이 들고 있고 이 컴포넌트는 받은 값을 그리기만 한다.
 * 다만 받은 값이 범위를 벗어나도 빈 화면이 되지 않도록 한계 안으로 끌어당긴다.
 */
export function DetailModal({
  card, subtasks = [], comments = [], statusName,
  columns, rows, scrollOffset = 0, loading = false,
}) {
  const boxWidth = modalWidth(columns);
  const boxHeight = modalHeight(rows);
  const inner = Math.max(BORDER, boxWidth - BORDER);   // 테두리 안쪽 전체
  const content = Math.max(4, boxWidth - FRAME);       // 글이 놓이는 자리
  const bodyHeight = Math.max(1, boxHeight - CHROME_ROWS);

  const lines = buildDetailLines({ card, subtasks, comments, statusName, width: content });
  const maxOffset = Math.max(0, lines.length - bodyHeight);
  const offset = Math.min(Math.max(0, scrollOffset), maxOffset);
  const visible = lines.slice(offset, offset + bodyHeight);

  const head = card ? `#${card.id}  ${card.summary ?? ''}` : '상세';
  const scrollable = lines.length > bodyHeight;
  const hint = scrollable
    ? `j/k 스크롤  Esc 닫기    ${offset + 1}-${offset + visible.length}/${lines.length}`
    : 'j/k 스크롤  Esc 닫기';

  // 팝업은 보드 위에 겹쳐 그려진다. 글자가 없는 칸은 아무것도 쓰지 않아 뒤가 그대로
  // 비치므로, 모든 줄을 테두리 안쪽 폭까지 공백으로 늘려 그 자리를 덮는다.
  // 여백도 Box 의 padding 대신 공백으로 넣는다. padding 이 만든 빈 칸은 칠해지지 않는다.
  const row = (text) => padTo(' ' + truncate(text ?? '', content), inner);

  // 내용이 짧아도 본문 높이만큼은 채워야 아래쪽에서 뒤가 비치지 않는다.
  const body = loading ? ['불러오는 중…'] : visible;
  const bodyRows = Array.from({ length: bodyHeight }, (_, i) => body[i] ?? '');

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="cyan"
         width={boxWidth} height={boxHeight}>
      <Text bold color="cyan">{row(head)}</Text>
      <Text color="gray">{row('─'.repeat(content))}</Text>

      {bodyRows.map((line, i) => (
        <Text key={offset + i} color={loading ? 'gray' : undefined}>{row(line)}</Text>
      ))}

      <Text color="gray">{row(hint)}</Text>
    </Box>
  );
}
