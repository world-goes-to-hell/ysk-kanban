// herdr-plugin/src/ui/Chrome.jsx
import { Box, Text } from 'ink';
import { truncate, width } from '../text.js';

// 실제로 동작하는 키만 적는다. 생성·수정·삭제·댓글은 웹과 MCP 도구가 맡으므로 여기에 없다.
// 좁은 화면에서는 뒤가 잘리므로 자주 쓰는 것부터 앞에 둔다.
const HINT = 'j/k 이동  h/l 칸  Enter 상세 팝업  Tab 패널  Space 상태변경  / 검색  p 프로젝트  f 필터  m 마우스  ? 도움말  q 종료';

// 목록 모드는 칸 구분이 없어 드롭 대상을 판정할 수 없다.
// 드래그가 듣지 않는 이유를 알리지 않으면 고장으로 오해한다.
const NARROW_NOTE = '좁은 화면: Space 로 상태 변경';
const GAP = '  ';

/** 안내 문구를 폭에 맞춘다. 목록 모드에서는 안내가 잘리지 않도록 자리를 먼저 떼어 둔다. */
function hintFor(mode, columns) {
  if (mode !== 'list') return truncate(HINT, columns);

  const note = truncate(NARROW_NOTE, columns);
  const rest = columns - width(note) - GAP.length;
  return rest > 0 ? `${truncate(HINT, rest)}${GAP}${note}` : note;
}

/**
 * pane 전체를 하나의 좌표계로 덮는다.
 *
 * layout.js 의 regions 는 pane 좌상단을 원점으로 계산하고, 마우스 이벤트도 같은 좌표로
 * 들어온다. 여기서 제목줄을 흐름 배치로 그리면 그 아래 Board 가 통째로 밀려서
 * 그려지는 곳과 눌리는 곳이 어긋난다. 그래서 제목줄·본문·안내를 모두 절대 좌표로 놓고,
 * children(Board) 의 원점을 pane 원점에 맞춘다.
 *
 * columns 와 rows 는 pane 의 크기이며, layout 을 계산할 때 넘긴 값과 같아야 한다.
 */
export function Chrome({ projectName, columns, rows, connected, error, mode, children }) {
  return (
    <Box width={columns} height={rows}>
      {/* 제목줄 — layout 의 project-name 영역과 같은 0 행 */}
      <Box position="absolute" marginTop={0} marginLeft={0} width={columns}>
        <Text bold color="cyan">ysk-kanban</Text>
        <Text>  </Text>
        <Text bold>{projectName ?? '(프로젝트 없음)'}</Text>
        <Box flexGrow={1} />
        <Text color={connected ? 'green' : 'yellow'}>
          {connected ? '실시간' : '주기 갱신'}
        </Text>
      </Box>

      {/* 본문 — 원점을 옮기지 않으므로 Board 내부 좌표가 곧 pane 좌표가 된다 */}
      <Box position="absolute" marginTop={0} marginLeft={0}>
        {children}
      </Box>

      {/* 하단 안내 — layout 의 FOOTER_ROWS 가 비워 둔 마지막 줄 */}
      <Box position="absolute" marginTop={rows - 1} marginLeft={0} width={columns}>
        {error
          ? <Text color="red">{truncate(error, columns)}</Text>
          : <Text color="gray">{hintFor(mode, columns)}</Text>}
      </Box>
    </Box>
  );
}
