// herdr-plugin/src/ui/Card.jsx
import { Box, Text } from 'ink';

const PRIORITY_LABEL = { HIGH: '높음', MEDIUM: '보통', LOW: '낮음' };
const PRIORITY_COLOR = { HIGH: 'red', MEDIUM: 'yellow', LOW: 'gray' };

// 한글·한자·가나·전각 기호는 터미널에서 두 칸을 차지한다.
// 글자 수로 자르면 표시 폭이 두 배가 되어 Ink 가 줄을 다시 접고,
// 그 결과 카드가 자기 테두리를 덮어쓰거나 영역 높이를 넘긴다.
const WIDE = /[ᄀ-ᅟ⺀-〾ぁ-㏿㐀-䶿一-鿿ꀀ-꓏가-힣豈-﫿︰-﹯＀-｠￠-￦]/;

/** 글자 하나가 터미널에서 차지하는 칸 수. */
function cellWidth(ch) {
  return WIDE.test(ch) ? 2 : 1;
}

/** 표시 폭이 width 를 넘지 않는 선에서 앞에서부터 몇 글자를 쓸 수 있는지 센다. */
function fitCount(chars, width) {
  let used = 0;
  let n = 0;
  while (n < chars.length && used + cellWidth(chars[n]) <= width) {
    used += cellWidth(chars[n]);
    n += 1;
  }
  return n;
}

/** 표시 폭 기준으로 잘라 낸다. 넘치면 끝에 말줄임표를 붙인다. */
export function truncate(text, width) {
  const chars = [...(text ?? '')];
  if (fitCount(chars, width) === chars.length) return chars.join('');
  const kept = fitCount(chars, Math.max(0, width - 1));
  return chars.slice(0, kept).join('') + '…';
}

/** 여러 줄로 접는다. 터미널 폭을 넘지 않도록 표시 폭 기준으로 자른다. */
function wrap(text, width, maxLines) {
  const chars = [...(text ?? '')];
  const out = [];
  let i = 0;

  while (i < chars.length && out.length < maxLines) {
    const n = Math.max(1, fitCount(chars.slice(i), width));
    out.push(chars.slice(i, i + n).join(''));
    i += n;
  }

  if (i < chars.length && out.length > 0) {
    out[out.length - 1] = truncate(out[out.length - 1] + chars[i], width);
  }
  return out;
}

// 카드는 CARD_HEIGHT(5) 행이고 테두리 두 줄을 빼면 쓸 수 있는 내용은 세 줄뿐이다.
// 번호·제목·마감일에 한 줄씩 배분한다. 제목을 두 줄로 늘리면 번호 줄이 밀려 사라지는데,
// 일감 번호는 웹과 MCP 도구를 오갈 때 카드를 지칭하는 유일한 식별자라 없으면 안 된다.
// 제목 전문은 오른쪽 상세 패널에서 본다.
const TITLE_LINES = 1;

export function Card({ card, width, selected = false, dimmed = false }) {
  const inner = Math.max(1, width - 4);
  const title = wrap(card.summary, inner, TITLE_LINES);

  const meta = [];
  if (card.dueDate) meta.push(card.completedAt ? `v${card.dueDate.slice(5)}` : `~${card.dueDate.slice(5)}`);
  if (card.subtaskTotal > 0) meta.push(`${card.subtaskDone ?? 0}/${card.subtaskTotal}`);
  if (card.hasActiveDiscussion) meta.push('*');

  return (
    <Box flexDirection="column" width={width} height={5}
         borderStyle={selected ? 'bold' : 'round'}
         borderColor={selected ? 'cyan' : 'gray'}
         paddingX={1}>
      <Text dimColor={dimmed}>
        <Text color="gray">#{card.id}</Text>
        {'  '}
        <Text color={PRIORITY_COLOR[card.priority] ?? 'gray'}>
          {PRIORITY_LABEL[card.priority] ?? ''}
        </Text>
      </Text>
      {title.map((line, i) => <Text key={i} dimColor={dimmed}>{line}</Text>)}
      <Text color="gray" dimColor={dimmed}>{meta.join('  ')}</Text>
    </Box>
  );
}

/**
 * 목록 모드용 한 줄짜리 카드.
 * layout.js 의 listRegions 가 높이를 1로 잡으므로 절대 두 줄이 되면 안 된다.
 */
export function CardRow({ card, width, selected = false, statusColor }) {
  const idText = `#${card.id}`;
  const metaText = card.dueDate ? ` ~${card.dueDate.slice(5)}` : '';
  const room = Math.max(1, width - idText.length - metaText.length - 4);

  return (
    <Box width={width}>
      <Text color={statusColor}>{selected ? '▌' : ' '}</Text>
      <Text color="gray">{idText} </Text>
      <Text bold={selected}>{truncate(card.summary, room)}</Text>
      <Text color="gray">{metaText}</Text>
    </Box>
  );
}
