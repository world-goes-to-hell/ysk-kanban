import { Box, Text } from 'ink';
import { truncate, padTo } from '../text.js';

/** 테두리가 차지하는 좌우 2 칸 */
const BORDER = 2;
/** 테두리 좌우 2 칸에 여백 2 칸씩을 더한 값 */
const FRAME = 6;
/** 키 이름이 차지하는 칸 */
const KEY_WIDTH = 10;
/** 글 왼쪽에 두는 여백 */
const PAD = '  ';

// 생성·수정·삭제·댓글은 웹과 MCP 도구가 맡으므로 여기에는 적지 않는다.
// 없는 기능을 도움말에 적으면 눌러 보고 아무 일도 일어나지 않아 혼란스럽다.
const GROUPS = [
  ['이동', [
    ['j / k', '카드 위아래'],
    ['h / l', '칸 좌우'],
    ['g / G', '칸의 처음 / 끝'],
    ['Tab', '오른쪽 상세 패널로 포커스'],
  ]],
  ['보기', [
    ['Enter', '상세 팝업 열기 (전문)'],
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
  const inner = Math.max(BORDER, width - BORDER);
  const content = Math.max(4, width - FRAME);
  const keyWidth = Math.min(KEY_WIDTH, Math.max(1, content - 1));

  // 겹쳐 그려지므로 모든 줄을 테두리 안쪽 폭까지 공백으로 늘려 뒤를 덮는다.
  // 키 이름 칸도 Box 의 width 대신 공백으로 맞춘다. Box 가 남긴 빈 칸은 칠해지지 않는다.
  const row = (text) => padTo(PAD + truncate(text ?? '', content), inner);
  const blank = row('');

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="cyan" width={width}>
      <Text>{blank}</Text>
      <Text bold color="cyan">{row('도움말')}</Text>

      {GROUPS.map(([name, rows]) => (
        <Box key={name} flexDirection="column">
          <Text>{blank}</Text>
          <Text bold color="gray">{row(name)}</Text>
          {rows.map(([k, desc]) => (
            <Text key={k}>
              {PAD}
              <Text color="yellow">{padTo(truncate(k, keyWidth), keyWidth)}</Text>
              {/* 글은 오른쪽 여백까지만 쓰되, 채우기는 테두리 안쪽 끝까지 한다 */}
              {padTo(truncate(desc, Math.max(1, content - keyWidth)),
                     inner - PAD.length - keyWidth)}
            </Text>
          ))}
        </Box>
      ))}

      <Text>{blank}</Text>
      <Text color="gray">{row('아무 키나 누르면 닫힙니다')}</Text>
      <Text>{blank}</Text>
    </Box>
  );
}
