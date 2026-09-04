// herdr-plugin/src/ui/Board.jsx
import { Box, Text } from 'ink';
import { Card, CardRow } from './Card.jsx';

export function Board({ layout, statuses, cardsByStatus, selected,
                        dragging = null, dropTarget = null }) {
  const byKey = Object.fromEntries(statuses.map(s => [s.statusKey, s]));

  // 카드 id 로 카드와 그 칸을 함께 찾을 수 있도록 미리 모아 둔다
  const cardById = new Map();
  for (const [statusKey, list] of Object.entries(cardsByStatus)) {
    for (const c of list) cardById.set(c.id, { card: c, statusKey });
  }

  const isList = layout.mode === 'list';

  // 자식이 모두 절대 배치라 흐름에서 빠지므로, 컨테이너가 스스로 크기를 갖지 못한다.
  // 크기를 주지 않으면 0x0 이 되어 아무것도 그려지지 않는다.
  // 크기 역시 regions 에서 끌어내야 좌표의 단일 출처가 유지된다.
  const width = Math.max(0, ...layout.regions.map(r => r.x + r.w));
  const height = Math.max(0, ...layout.regions.map(r => r.y + r.h));

  return (
    <Box flexDirection="column" width={width} height={height}>
      {layout.regions.map((r, i) => {
        if (r.kind === 'column-header') {
          const s = byKey[r.id];
          if (!s) return null;
          const count = (cardsByStatus[r.id] ?? []).length;
          const isTarget = dropTarget === r.id;
          // 카드가 없는 칸에 선택이 가면 화면에 아무 표시가 없어 자기 위치를 알 수 없다.
          // 드롭 대상과는 다른 표시를 써야 끌어다 놓는 중인지 그냥 머무는 중인지 구분된다.
          const isCurrent = !isTarget && selected?.statusKey === r.id;
          return (
            <Box key={`h-${i}`} position="absolute" marginLeft={r.x} marginTop={r.y} width={r.w}>
              <Text bold color={isTarget ? 'cyan' : s.color}
                    inverse={isTarget} underline={isCurrent}>
                {isTarget ? `▸ ${s.name} ◂` : isCurrent ? `▌${s.name}` : s.name}
              </Text>
              {/*
                완료 칸에는 오늘 끝낸 것만 담긴다. 그 사실을 적어 두지 않으면
                오늘 완료가 없는 날에 칸이 비어 보여 고장으로 오해한다.
              */}
              <Text color="gray">
                {` ${count}`}{s.semanticStatus === 'DONE' ? ' · 오늘' : ''}
              </Text>
            </Box>
          );
        }

        if (r.kind === 'card') {
          const found = cardById.get(r.id);
          if (!found) return null;
          const { card, statusKey } = found;
          const chosen = selected?.cardId === card.id;

          // 목록 모드는 영역 높이가 1이므로 한 줄짜리로 그린다.
          // 여기서 갈라 쓰지 않으면 좌표와 화면이 어긋난다.
          return (
            <Box key={`c-${i}`} position="absolute" marginLeft={r.x} marginTop={r.y}>
              {isList
                ? <CardRow card={card} width={r.w} selected={chosen}
                           statusColor={byKey[statusKey]?.color} />
                : <Card card={card} width={r.w} selected={chosen}
                        dimmed={dragging === card.id} />}
            </Box>
          );
        }

        return null;
      })}
    </Box>
  );
}
