import { Box, Text } from 'ink';
import { truncate, truncateStart, padTo, width as cellWidth } from '../text.js';

/** 테두리가 차지하는 좌우 2 칸 */
const BORDER = 2;
/** 테두리 좌우 2 칸에 여백 2 칸씩을 더한 값 */
const FRAME = 6;
/** 커서 '_' 가 차지하는 폭 */
const CURSOR = 1;
/** 글 왼쪽에 두는 여백 */
const PAD = '  ';

export function Input({ title, value, placeholder = '', width = 60 }) {
  const inner = Math.max(BORDER, width - BORDER);
  const content = Math.max(4, width - FRAME);
  const valueWidth = Math.max(1, content - CURSOR);

  // 겹쳐 그려지므로 모든 줄을 테두리 안쪽 폭까지 공백으로 늘려 뒤를 덮는다.
  const row = (text) => padTo(PAD + truncate(text ?? '', content), inner);

  const shown = value ? truncateStart(value, valueWidth) : truncate(placeholder, valueWidth);
  const fill = ' '.repeat(Math.max(0, inner - cellWidth(PAD + shown) - CURSOR));

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="cyan" width={width}>
      <Text bold color="cyan">{row(title)}</Text>

      <Text>
        {PAD}
        {value ? <Text>{shown}</Text> : <Text color="gray">{shown}</Text>}
        <Text color="cyan">_</Text>
        {fill}
      </Text>

      <Text color="gray">{row('Enter 확인  Esc 취소')}</Text>
    </Box>
  );
}
