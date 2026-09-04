import { Box, Text } from 'ink';
import { truncate, padTo, width as cellWidth } from '../text.js';

/** 테두리가 차지하는 좌우 2 칸 */
const BORDER = 2;
/** 테두리 좌우 2 칸에 여백 2 칸씩을 더한 값 */
const FRAME = 6;
/** 선택 표시 '> ' 가 차지하는 폭 */
const MARK = 2;
/** 글 왼쪽에 두는 여백 */
const PAD = '  ';

export function Palette({ title, items, selectedIndex, width = 40 }) {
  const inner = Math.max(BORDER, width - BORDER);
  const content = Math.max(4, width - FRAME);
  const labelWidth = Math.max(1, content - MARK);

  // 팝업은 보드 위에 겹쳐 그려진다. 글자가 없는 칸은 아무것도 쓰지 않아 뒤가 비치므로,
  // 모든 줄을 테두리 안쪽 폭까지 공백으로 늘린다. 여백도 padding 대신 공백으로 넣는다.
  const row = (text) => padTo(PAD + truncate(text ?? '', content), inner);
  const fillAfter = (text) => ' '.repeat(Math.max(0, inner - cellWidth(text)));

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="cyan" width={width}>
      <Text>{row('')}</Text>
      <Text bold color="cyan">{row(title)}</Text>
      <Text>{row('')}</Text>

      {items.length === 0
        ? <Text color="gray">{row('항목이 없습니다')}</Text>
        : items.map((it, i) => {
            const mark = i === selectedIndex ? '> ' : '  ';
            const label = truncate(it.label, labelWidth);
            return (
              <Text key={it.id} color={i === selectedIndex ? 'cyan' : undefined}
                    bold={i === selectedIndex}>
                {PAD + mark}
                <Text color={it.color}>{label}</Text>
                {fillAfter(PAD + mark + label)}
              </Text>
            );
          })}

      <Text>{row('')}</Text>
      <Text color="gray">{row('j/k 이동  Enter 선택  Esc 취소')}</Text>
      <Text>{row('')}</Text>
    </Box>
  );
}
