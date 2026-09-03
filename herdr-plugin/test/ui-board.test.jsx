import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import { Board } from '../src/ui/Board.jsx';
import { Chrome } from '../src/ui/Chrome.jsx';
import { computeLayout } from '../src/layout.js';

const statuses = [
  { statusKey: 'TODO', name: '할 일', color: '#2563EB', position: 0 },
  { statusKey: 'DONE', name: '완료', color: '#059669', position: 1 },
];

const cardsByStatus = {
  TODO: [{ id: 1, summary: '첫 번째 일감', priority: 'HIGH', dueDate: '2026-09-05', subtaskTotal: 3, subtaskDone: 1 }],
  DONE: [],
};

function frame(over = {}) {
  const layout = computeLayout({
    columns: 160, rows: 24, statuses, cardsByStatus,
    scroll: {}, collapsed: {}, columnOffset: 0, ...over,
  });
  return render(
    <Board layout={layout} statuses={statuses} cardsByStatus={cardsByStatus}
           selected={{ statusKey: 'TODO', cardId: 1 }} />
  ).lastFrame();
}

describe('Board', () => {
  it('칸 이름과 카드 수를 보여준다', () => {
    const f = frame();
    expect(f).toContain('할 일');
    expect(f).toContain('완료');
  });

  it('카드 제목을 보여준다', () => {
    expect(frame()).toContain('첫 번째 일감');
  });

  it('일감 번호를 보여준다', () => {
    expect(frame()).toContain('#1');
  });

  it('하위 일감 진행도를 보여준다', () => {
    expect(frame()).toContain('1/3');
  });

  it('마감일을 보여준다', () => {
    expect(frame()).toContain('09-05');
  });

  it('카드가 없는 칸도 머리를 보여준다', () => {
    expect(frame()).toContain('완료');
  });

  it('접힌 칸은 카드를 그리지 않는다', () => {
    expect(frame({ collapsed: { TODO: true } })).not.toContain('첫 번째 일감');
  });

  it('긴 제목은 칸 폭에 맞춰 자른다', () => {
    const long = { TODO: [{ id: 1, summary: '가'.repeat(200), priority: 'LOW' }], DONE: [] };
    const layout = computeLayout({ columns: 160, rows: 24, statuses, cardsByStatus: long });
    const f = render(<Board layout={layout} statuses={statuses} cardsByStatus={long} selected={null} />).lastFrame();
    for (const line of f.split('\n')) expect(line.length).toBeLessThanOrEqual(160);
  });

  it('한글 제목이 길어도 카드가 자기 테두리를 덮지 않는다', () => {
    const long = { TODO: [{ id: 1, summary: '가'.repeat(200), priority: 'LOW' }], DONE: [] };
    const layout = computeLayout({ columns: 160, rows: 24, statuses, cardsByStatus: long });
    const region = layout.regions.find(r => r.kind === 'card');
    const f = render(<Board layout={layout} statuses={statuses} cardsByStatus={long} selected={null} />).lastFrame();
    const rows = f.split('\n');
    // 카드 영역의 첫 줄과 마지막 줄은 테두리다. 제목이 여기까지 흘러넘치면 안 된다.
    expect(rows[region.y]).not.toContain('가');
    expect(rows[region.y + region.h - 1]).not.toContain('가');
  });
});

describe('Board — 목록 모드', () => {
  const listLayout = () => computeLayout({
    columns: 80, rows: 24, statuses, cardsByStatus, scroll: {}, collapsed: {}, columnOffset: 0,
  });

  it('목록 모드로 계산된다', () => {
    expect(listLayout().mode).toBe('list');
  });

  it('카드 한 건이 한 줄만 차지한다', () => {
    const layout = listLayout();
    const f = render(<Board layout={layout} statuses={statuses}
                            cardsByStatus={cardsByStatus} selected={null} />).lastFrame();
    const hits = f.split('\n').filter(l => l.includes('첫 번째 일감'));
    expect(hits).toHaveLength(1);
  });

  it('그려진 줄 수가 레이아웃이 예상한 높이를 넘지 않는다', () => {
    const layout = listLayout();
    const cardRegions = layout.regions.filter(r => r.kind === 'card');
    const f = render(<Board layout={layout} statuses={statuses}
                            cardsByStatus={cardsByStatus} selected={null} />).lastFrame();
    // 카드 영역 높이의 합이 실제 렌더 줄 수보다 작으면 좌표와 화면이 어긋난 것이다
    const drawn = f.split('\n').filter(l => l.includes('첫 번째 일감')).length;
    expect(drawn).toBeLessThanOrEqual(cardRegions.reduce((n, r) => n + r.h, 0));
  });

  it('한글 제목이 길어도 한 줄만 차지한다', () => {
    const long = { TODO: [{ id: 1, summary: '가'.repeat(200), priority: 'LOW' }], DONE: [] };
    const layout = computeLayout({ columns: 80, rows: 24, statuses, cardsByStatus: long });
    const region = layout.regions.find(r => r.kind === 'card');
    const f = render(<Board layout={layout} statuses={statuses} cardsByStatus={long} selected={null} />).lastFrame();
    const drawn = f.split('\n').filter(l => l.includes('가')).length;
    expect(drawn).toBe(region.h);
  });
});

describe('Chrome 과 Board 의 좌표계', () => {
  // layout.regions 의 좌표는 pane 좌상단이 원점이다. 마우스 이벤트도 같은 좌표로 들어오므로,
  // 화면에 그려진 행 번호가 regions 의 y 와 정확히 같아야 눌리는 곳과 보이는 곳이 맞는다.
  it('layout 이 말한 행에 그대로 그려진다', () => {
    const layout = computeLayout({
      columns: 160, rows: 24, statuses, cardsByStatus,
      scroll: {}, collapsed: {}, columnOffset: 0,
    });
    const f = render(
      <Chrome projectName="테스트프로젝트" columns={160} rows={24} connected={true} error={null}>
        <Board layout={layout} statuses={statuses} cardsByStatus={cardsByStatus} selected={null} />
      </Chrome>
    ).lastFrame();
    const rows = f.split('\n');

    const name = layout.regions.find(r => r.kind === 'project-name');
    expect(rows[name.y]).toContain('테스트프로젝트');

    const head = layout.regions.find(r => r.kind === 'column-header' && r.id === 'TODO');
    expect(rows[head.y]).toContain('할 일');

    const card = layout.regions.find(r => r.kind === 'card');
    expect(rows[card.y]).toContain('╭');                    // 카드 위쪽 테두리
    expect(rows[card.y + card.h - 1]).toContain('╰');       // 카드 아래쪽 테두리

    // 하단 안내는 layout 이 FOOTER_ROWS 로 비워 둔 마지막 줄에 있어야 한다.
    expect(rows[24 - 1]).toContain('q 종료');
  });
});
