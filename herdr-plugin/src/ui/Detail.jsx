import { Box, Text } from 'ink';
import { truncate, wrap } from '../text.js';

const PRIORITY_LABEL = { HIGH: '높음', MEDIUM: '보통', LOW: '낮음' };
const LABEL_WIDTH = 7;
const MARK_WIDTH = 3;

function Row({ label, value, maxWidth }) {
  return (
    <Box>
      <Box width={LABEL_WIDTH}><Text color="gray">{label}</Text></Box>
      <Text>{truncate(value, maxWidth)}</Text>
    </Box>
  );
}

export function Detail({ card, subtasks = [], comments = [], statusName, width, loading }) {
  if (!card) {
    return <Box width={width}><Text color="gray">선택된 일감이 없습니다</Text></Box>;
  }

  const inner = Math.max(10, width - 2);
  const valueWidth = Math.max(1, inner - LABEL_WIDTH);
  const markedWidth = Math.max(1, inner - MARK_WIDTH);

  return (
    <Box flexDirection="column" width={width} paddingX={1}>
      <Text color="gray">#{card.id}</Text>
      {wrap(card.summary, inner, 3).map((l, i) => <Text key={i} bold>{l}</Text>)}

      {loading && <Text color="gray">불러오는 중…</Text>}

      <Text color="gray">{'─'.repeat(inner)}</Text>
      <Row label="상태" value={statusName ?? card.statusKey} maxWidth={valueWidth} />
      <Row label="우선" value={PRIORITY_LABEL[card.priority] ?? '-'} maxWidth={valueWidth} />
      <Row label="마감" value={card.dueDate ?? '-'} maxWidth={valueWidth} />
      <Row label="담당" value={(card.assignees ?? []).map(a => a.username).join(', ') || '-'}
           maxWidth={valueWidth} />

      {card.description && (
        <>
          <Text color="gray">{'─'.repeat(inner)}</Text>
          {wrap(card.description, inner, 6).map((l, i) => <Text key={i}>{l}</Text>)}
        </>
      )}

      {subtasks.length > 0 && (
        <>
          <Text color="gray">{'─'.repeat(inner)}</Text>
          <Text color="gray">
            하위 {subtasks.filter(s => s.statusKey === 'DONE').length}/{subtasks.length}
          </Text>
          {subtasks.slice(0, 6).map(s => (
            <Box key={s.id}>
              <Box width={MARK_WIDTH}>
                <Text color={s.statusKey === 'DONE' ? 'green' : 'gray'}>
                  {s.statusKey === 'DONE' ? ' v ' : ' o '}
                </Text>
              </Box>
              <Text>{truncate(s.summary, markedWidth)}</Text>
            </Box>
          ))}
        </>
      )}

      {comments.length > 0 && (
        <>
          <Text color="gray">{'─'.repeat(inner)}</Text>
          <Text color="gray">댓글 {comments.length}</Text>
          {comments.slice(-3).map(c => (
            <Text key={c.id}>{truncate(c.content, inner)}</Text>
          ))}
        </>
      )}
    </Box>
  );
}
