import { Box, Text } from 'ink';
import { truncate } from '../text.js';

/** 테두리 좌우 2 칸에 paddingX 2 씩을 더한 값 */
const FRAME = 6;
/** 선택 표시 '> ' 가 차지하는 폭 */
const MARK = 2;

export function Palette({ title, items, selectedIndex, width = 40 }) {
  const inner = Math.max(4, width - FRAME);
  const labelWidth = Math.max(1, inner - MARK);

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="cyan"
         paddingX={2} paddingY={1} width={width}>
      <Text bold color="cyan">{truncate(title, inner)}</Text>
      <Text> </Text>
      {items.length === 0
        ? <Text color="gray">항목이 없습니다</Text>
        : items.map((it, i) => (
            <Text key={it.id} color={i === selectedIndex ? 'cyan' : undefined}
                  bold={i === selectedIndex}>
              {i === selectedIndex ? '> ' : '  '}
              <Text color={it.color}>{truncate(it.label, labelWidth)}</Text>
            </Text>
          ))}
      <Text> </Text>
      <Text color="gray">{truncate('j/k 이동  Enter 선택  Esc 취소', inner)}</Text>
    </Box>
  );
}
