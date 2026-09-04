import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import { DetailModal, buildDetailLines } from '../src/ui/DetailModal.jsx';
import { width as widthOf } from '../src/text.js';

const COLUMNS = 120;
const ROWS = 30;

const card = {
  id: 1902,
  summary: '커스텀 SQL 배치 등록 오류 수정',
  description: '배치 등록 시 파라미터가 누락된다.\n스테이징 경로에서만 재현된다.',
  statusKey: 'IN_PROGRESS', priority: 'HIGH', dueDate: '2026-09-05',
  assignees: [{ id: 1, username: 'ysk' }],
};

const subtasks = [
  { id: 1903, summary: '스키마 정의', statusKey: 'DONE' },
  { id: 1904, summary: '배치 등록 처리', statusKey: 'TODO' },
];

const comments = [
  { id: 1, content: '재현 확인함', author: { username: 'ysk' }, createdAt: '2026-09-01T10:00:00' },
];

const frame = (over = {}) => render(
  <DetailModal card={card} subtasks={subtasks} comments={comments} statusName="진행 중"
               columns={COLUMNS} rows={ROWS} scrollOffset={0} loading={false} {...over} />
).lastFrame();

describe('DetailModal', () => {
  it('일감 번호와 제목이 보인다', () => {
    const f = frame();
    expect(f).toContain('#1902');
    expect(f).toContain('커스텀 SQL');
  });

  it('상태·우선순위·마감·담당자가 보인다', () => {
    const f = frame();
    expect(f).toContain('진행 중');
    expect(f).toContain('높음');
    expect(f).toContain('2026-09-05');
    expect(f).toContain('ysk');
  });

  it('설명이 여러 줄이면 여러 줄로 나온다', () => {
    const f = frame();
    expect(f).toContain('파라미터가 누락된다');
    expect(f).toContain('스테이징 경로에서만');
  });

  it('하위 일감과 댓글이 보인다', () => {
    const f = frame();
    expect(f).toContain('스키마 정의');
    expect(f).toContain('배치 등록 처리');
    expect(f).toContain('재현 확인함');
  });

  it('scrollOffset 을 주면 그만큼 위가 잘린다', () => {
    // 내용이 다 들어가는 화면에서는 스크롤할 것이 없으므로 높이를 좁혀 시험한다.
    // 본문 첫 줄은 '상태' 항목이다. 두 줄을 건너뛰면 사라지고 '마감' 이 위로 올라온다.
    expect(frame({ rows: 14, scrollOffset: 0 })).toContain('상태');
    const scrolled = frame({ rows: 14, scrollOffset: 2 });
    expect(scrolled).not.toContain('상태');
    expect(scrolled).toContain('마감');
  });

  it('어떤 줄도 주어진 폭을 넘지 않는다', () => {
    const long = {
      ...card,
      summary: '커스텀 SQL 배치 등록에서 파라미터가 누락되어 발생하는 오류를 근본적으로 수정하고 회귀 테스트까지 더한다',
      description: '스테이징 테이블에 적재하는 경로와 라이브 테이블에 직접 쓰는 경로가 서로 다른 검증을 거치기 때문이며, '
        + '두 경로를 하나로 합치고 공통 검증을 앞단으로 끌어올려야 한다. 추가로 실패 시 롤백이 부분적으로만 일어나는 문제도 살펴야 한다.',
      assignees: [{ username: '유성관' }, { username: '김담당' }, { username: '이검토' }, { username: '박확인' }],
    };
    const f = frame({
      card: long,
      subtasks: [{ id: 1, summary: '스테이징 테이블 스키마를 정의하고 인덱스 전략까지 확정한다', statusKey: 'DONE' }],
      comments: [{ id: 1, content: '재현 확인함. 스테이징 경로에서만 발생하며 라이브 경로는 정상이었다.',
                   author: { username: '유성관' }, createdAt: '2026-09-01T10:00:00' }],
    });

    const lines = f.split('\n');
    const boxWidth = widthOf(lines[0]);   // 테두리 윗줄이 곧 팝업의 폭이다
    expect(boxWidth).toBeLessThanOrEqual(COLUMNS);
    for (const line of lines) expect(widthOf(line)).toBeLessThanOrEqual(boxWidth);
  });

  it('카드가 없으면 안내 문구를 보여준다', () => {
    expect(frame({ card: null })).toContain('선택된 일감이 없습니다');
  });
});

describe('buildDetailLines', () => {
  const base = {
    card: { id: 1, summary: '제목', statusKey: 'TODO', priority: 'HIGH', dueDate: '2026-09-05', assignees: [] },
    statusName: '할 일', width: 60,
  };

  it('내용에 맞는 줄 수를 돌려준다', () => {
    // 항목 넉 줄뿐이다. 제목은 팝업이 고정 머리로 따로 그린다.
    expect(buildDetailLines(base)).toHaveLength(4);

    // 구분선 한 줄과 설명 한 줄이 더해진다
    expect(buildDetailLines({ ...base, card: { ...base.card, description: '한 줄 설명' } }))
      .toHaveLength(6);

    // 구분선 한 줄, '하위 1/1' 머리 한 줄, 항목 한 줄이 더해진다
    expect(buildDetailLines({ ...base, subtasks: [{ id: 2, summary: '하나', statusKey: 'DONE' }] }))
      .toHaveLength(7);
  });

  it('설명이 길면 폭에 맞춰 여러 줄로 나눈다', () => {
    const lines = buildDetailLines({
      ...base,
      card: { ...base.card, description: '가'.repeat(100) },   // 폭 200, 한 줄에 30자씩
      width: 60,
    });
    for (const line of lines) expect(widthOf(line)).toBeLessThanOrEqual(60);
    expect(lines.length).toBeGreaterThan(6);
  });
});
