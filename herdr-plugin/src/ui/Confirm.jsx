import { Box, Text } from 'ink';
import { truncate, padTo, width as cellWidth } from '../text.js';

/** 테두리가 차지하는 좌우 2 칸 */
const BORDER = 2;
/** 테두리 좌우 2 칸에 여백 2 칸씩을 더한 값 */
const FRAME = 6;
/** 글 왼쪽에 두는 여백 */
const PAD = '  ';

export function Confirm({ message, detail, width = 50 }) {
  const inner = Math.max(BORDER, width - BORDER);
  const content = Math.max(4, width - FRAME);

  // 겹쳐 그려지므로 모든 줄을 테두리 안쪽 폭까지 공백으로 늘려 뒤를 덮는다.
  const row = (text) => padTo(PAD + truncate(text ?? '', content), inner);
  const answer = 'y 예    n 아니오 (Esc 도 취소)';

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="yellow" width={width}>
      <Text>{row('')}</Text>
      <Text bold color="yellow">{row(message)}</Text>
      {detail && <Text color="gray">{row(detail)}</Text>}
      <Text>{row('')}</Text>

      <Text>
        {PAD}
        <Text bold color="green">y</Text>
        <Text color="gray"> 예    </Text>
        <Text bold color="red">n</Text>
        <Text color="gray"> 아니오 (Esc 도 취소)</Text>
        {' '.repeat(Math.max(0, inner - cellWidth(PAD + answer)))}
      </Text>

      <Text>{row('')}</Text>
    </Box>
  );
}
