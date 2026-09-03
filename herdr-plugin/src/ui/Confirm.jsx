import { Box, Text } from 'ink';
import { truncate } from '../text.js';

/** 테두리 좌우 2 칸에 paddingX 2 씩을 더한 값 */
const FRAME = 6;

export function Confirm({ message, detail, width = 50 }) {
  const inner = Math.max(4, width - FRAME);

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="yellow"
         paddingX={2} paddingY={1} width={width}>
      <Text bold color="yellow">{truncate(message, inner)}</Text>
      {detail && <Text color="gray">{truncate(detail, inner)}</Text>}
      <Text> </Text>
      <Text>
        <Text bold color="green">y</Text>
        <Text color="gray"> 예    </Text>
        <Text bold color="red">n</Text>
        <Text color="gray"> 아니오 (Esc 도 취소)</Text>
      </Text>
    </Box>
  );
}
