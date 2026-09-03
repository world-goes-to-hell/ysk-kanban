import { Box, Text } from 'ink';
import { truncate } from '../text.js';

/** 테두리 좌우 2 칸에 paddingX 2 씩을 더한 값 */
const FRAME = 6;
/** 커서 '_' 가 차지하는 폭 */
const CURSOR = 1;

export function Input({ title, value, placeholder = '', width = 60 }) {
  const inner = Math.max(4, width - FRAME);
  const valueWidth = Math.max(1, inner - CURSOR);

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="cyan"
         paddingX={2} width={width}>
      <Text bold color="cyan">{truncate(title, inner)}</Text>
      <Text>
        {value
          ? truncate(value, valueWidth)
          : <Text color="gray">{truncate(placeholder, valueWidth)}</Text>}
        <Text color="cyan">_</Text>
      </Text>
      <Text color="gray">{truncate('Enter 확인  Esc 취소', inner)}</Text>
    </Box>
  );
}
