import { describe, it, expect } from 'vitest';
import { Box, Text } from 'ink';
import { render } from 'ink-testing-library';
import { width } from '../src/text.js';
import { DetailModal, modalWidth, modalHeight } from '../src/ui/DetailModal.jsx';
import { Palette } from '../src/ui/Palette.jsx';
import { Confirm } from '../src/ui/Confirm.jsx';
import { Input } from '../src/ui/Input.jsx';
import { Help } from '../src/ui/Help.jsx';

const ANSI = new RegExp(String.fromCharCode(27) + '\\[[0-9;]*m', 'g');
const SCREEN_W = 96;
const SCREEN_H = 30;
const MARK = 'X'; // 뒤에 깔아 두는 표시. 팝업 안에 남아 있으면 덮지 못한 것이다.

const clean = (frame) => frame.replace(ANSI, '').split('\n');

/** 화면 칸 기준으로 잘라낸다. 한글은 두 칸을 차지하므로 글자 수로 자르면 어긋난다. */
function sliceCells(line, start, count) {
  let col = 0;
  let out = '';
  for (const ch of line) {
    if (col >= start && col < start + count) out += ch;
    col += width(ch);
  }
  return out;
}

/**
 * 팝업을 표시로 가득 채운 화면 위에 겹쳐 그린 뒤, 팝업 자리에 표시가 남는지 본다.
 *
 * 단독으로 렌더해서 줄 폭만 재면 이 결함을 잡지 못한다. Ink 는 글자가 없는 칸에
 * 아무것도 쓰지 않으므로, 겹쳐 그렸을 때 비로소 뒤가 비치는 것이 드러난다.
 */
function bleedingRows(node, { left, top, boxWidth, boxHeight }) {
  const frame = render(
    <Box width={SCREEN_W} height={SCREEN_H}>
      <Box position="absolute" marginTop={0} marginLeft={0} flexDirection="column">
        {Array.from({ length: SCREEN_H }, (_, i) => (
          <Text key={i}>{MARK.repeat(SCREEN_W)}</Text>
        ))}
      </Box>
      <Box position="absolute" marginTop={top} marginLeft={left}>{node}</Box>
    </Box>
  ).lastFrame();

  const rows = clean(frame);
  const bad = [];
  for (let y = top; y < top + boxHeight; y++) {
    const inside = sliceCells(rows[y] ?? '', left, boxWidth);
    if (inside.includes(MARK)) bad.push(`${y}행: ${inside}`);
  }
  return bad;
}

const card = {
  id: 137,
  summary: '사용독려 알림톡 템플릿 추가',
  description: '설명입니다. '.repeat(40),
  statusKey: 'TODO',
  priority: 'HIGH',
  dueDate: '2026-03-31',
};

describe('상세 팝업이 뒤를 덮는다', () => {
  const cases = [[120, 30], [96, 26]];

  for (const [columns, rows] of cases) {
    it(`${columns}x${rows} 화면에서 뒤가 비치지 않는다`, () => {
      const node = (
        <DetailModal card={card} subtasks={[]} comments={[]} statusName="할 일"
                     columns={columns} rows={rows} scrollOffset={0} />
      );
      expect(bleedingRows(node, {
        left: 2, top: 1, boxWidth: modalWidth(columns), boxHeight: modalHeight(rows),
      })).toEqual([]);
    });
  }

  it('내용이 짧아 아래가 남아도 비치지 않는다', () => {
    const tiny = { id: 1, summary: '짧다', statusKey: 'TODO', priority: 'LOW' };
    const node = <DetailModal card={tiny} statusName="할 일" columns={120} rows={30} scrollOffset={0} />;
    expect(bleedingRows(node, {
      left: 2, top: 1, boxWidth: modalWidth(120), boxHeight: modalHeight(30),
    })).toEqual([]);
  });

  it('불러오는 중에도 비치지 않는다', () => {
    const node = (
      <DetailModal card={card} statusName="할 일" columns={120} rows={30}
                   scrollOffset={0} loading />
    );
    expect(bleedingRows(node, {
      left: 2, top: 1, boxWidth: modalWidth(120), boxHeight: modalHeight(30),
    })).toEqual([]);
  });
});

describe('상세 팝업이 선언한 높이를 빠짐없이 그린다', () => {
  // 줄 수가 모자라면 그 아래에서 뒤의 보드가 그대로 보인다.
  // 폭만 재는 검사로는 잡히지 않으므로 줄 수를 따로 못박는다.
  const short = { id: 1, summary: '짧다', statusKey: 'TODO', priority: 'LOW' };
  const long = {
    id: 2, summary: '긴 일감', statusKey: 'TODO', priority: 'HIGH',
    description: '설명입니다. '.repeat(200),
  };

  const linesOf = (props) => clean(render(
    <DetailModal statusName="할 일" scrollOffset={0} {...props} />
  ).lastFrame());

  for (const [columns, rows] of [[120, 30], [214, 48], [96, 26]]) {
    it(`${columns}x${rows}: 내용이 짧아도 줄 수가 팝업 높이와 같다`, () => {
      expect(linesOf({ card: short, columns, rows })).toHaveLength(modalHeight(rows));
    });

    it(`${columns}x${rows}: 내용이 넘쳐도 줄 수가 팝업 높이와 같다`, () => {
      expect(linesOf({ card: long, columns, rows })).toHaveLength(modalHeight(rows));
    });
  }

  it('모든 줄의 폭이 팝업 폭과 같다', () => {
    const rows = linesOf({ card: short, columns: 120, rows: 30 });
    for (const [i, line] of rows.entries()) {
      expect(`${i}행 폭 ${width(line)}`).toBe(`${i}행 폭 ${modalWidth(120)}`);
    }
  });

  // 크기를 받지 못하면 NaN 이 번져 본문이 0 줄로 접히고 뒤가 그대로 드러난다.
  it('크기를 받지 못해도 무너지지 않는다', () => {
    const rows = linesOf({ card: long, columns: undefined, rows: undefined });
    expect(rows).toHaveLength(modalHeight(undefined));
    expect(rows.length).toBeGreaterThan(5);
    for (const line of rows) expect(width(line)).toBe(modalWidth(undefined));
  });
});

describe('작은 팝업들도 뒤를 덮는다', () => {
  const items = [
    { id: 'TODO', label: '할 일', color: '#2563EB' },
    { id: 'CUSTOM_86CB8EB5', label: '보류' },
  ];

  const check = (node, boxWidth, boxHeight) =>
    expect(bleedingRows(node, { left: 3, top: 2, boxWidth, boxHeight })).toEqual([]);

  it('Palette', () => {
    check(<Palette title="어느 칸으로 옮길까요" items={items} selectedIndex={0} width={40} />, 40, 9);
  });

  it('Confirm', () => {
    check(<Confirm message="완료 칸으로 옮길까요?"
                   detail="끝나지 않은 하위 일감이 2건 있습니다" width={50} />, 50, 7);
  });

  it('Input', () => {
    check(<Input title="제목으로 찾기" value=""
                 placeholder="글자를 입력하면 바로 걸러집니다" width={60} />, 60, 5);
  });

  it('Help', () => {
    check(<Help width={44} />, 44, 24);
  });
});
