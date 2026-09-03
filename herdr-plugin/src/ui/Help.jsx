import { Box, Text } from 'ink';
import { truncate } from '../text.js';

/** 테두리 좌우 2 칸에 paddingX 2 씩을 더한 값 */
const FRAME = 6;
/** 키 이름이 차지하는 칸 */
const KEY_WIDTH = 10;

// 생성·수정·삭제·댓글은 웹과 MCP 도구가 맡으므로 여기에는 적지 않는다.
// 없는 기능을 도움말에 적으면 눌러 보고 아무 일도 일어나지 않아 혼란스럽다.
const GROUPS = [
  ['이동', [
    ['j / k', '카드 위아래'],
    ['h / l', '칸 좌우'],
    ['g / G', '칸의 처음 / 끝'],
    ['Tab', '보드와 상세 전환'],
  ]],
  ['보기', [
    ['Enter', '상세 열기'],
    ['/', '제목 검색'],
    ['f', '필터'],
    ['p', '프로젝트 전환'],
    ['r', '새로고침'],
  ]],
  ['상태', [
    ['Space', '상태 변경'],
    ['H / L', '옆 칸으로 이동'],
  ]],
  ['기타', [
    ['m', '마우스 켜기·끄기'],
    ['?', '이 도움말'],
    ['q', '종료'],
  ]],
];

export function Help({ width = 44 }) {
  const inner = Math.max(4, width - FRAME);
  const keyWidth = Math.min(KEY_WIDTH, Math.max(1, inner - 1));
  const descWidth = Math.max(1, inner - keyWidth);

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="cyan"
         paddingX={2} paddingY={1} width={width}>
      <Text bold color="cyan">도움말</Text>
      {GROUPS.map(([name, rows]) => (
        <Box key={name} flexDirection="column" marginTop={1}>
          <Text bold color="gray">{truncate(name, inner)}</Text>
          {rows.map(([k, desc]) => (
            <Box key={k}>
              <Box width={keyWidth}><Text color="yellow">{truncate(k, keyWidth)}</Text></Box>
              <Text>{truncate(desc, descWidth)}</Text>
            </Box>
          ))}
        </Box>
      ))}
      <Text> </Text>
      <Text color="gray">{truncate('아무 키나 누르면 닫힙니다', inner)}</Text>
    </Box>
  );
}
