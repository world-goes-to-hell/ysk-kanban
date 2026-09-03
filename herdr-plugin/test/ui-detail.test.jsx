import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import { Detail } from '../src/ui/Detail.jsx';
import { width } from '../src/text.js';

const WIDTH = 40;

// 한글은 한 칸이 아니라 두 칸을 차지하므로, 폭 검사가 실제로 무언가를 잡아내려면
// 주어진 폭을 훌쩍 넘기는 긴 한글 문자열로 시험해야 한다.
const card = {
  id: 1902,
  summary: '커스텀 SQL 배치 등록에서 파라미터가 누락되어 발생하는 오류를 근본적으로 수정하고 회귀 테스트까지 추가한다',
  description:
    '배치 등록 시 파라미터가 누락되는 문제가 특정 조건에서만 재현된다. '
    + '스테이징 테이블에 적재하는 경로와 라이브 테이블에 직접 쓰는 경로가 서로 다른 검증을 거치기 때문이며, '
    + '두 경로를 하나로 합치고 공통 검증을 앞단으로 끌어올려야 한다. '
    + '추가로 실패 시 롤백이 부분적으로만 일어나는 문제도 함께 살펴야 한다.',
  statusKey: 'IN_PROGRESS', priority: 'HIGH', dueDate: '2026-09-05',
  assignees: [
    { id: 1, username: 'ysk' }, { id: 2, username: '김담당' },
    { id: 3, username: '이검토' }, { id: 4, username: '박확인' },
  ],
};

const subtasks = [
  { id: 1903, summary: '스키마 정의를 확정하고 인덱스 전략까지 문서로 남긴다', statusKey: 'DONE' },
  { id: 1904, summary: '배치 등록 처리 경로를 하나로 합치고 공통 검증을 앞단으로 옮긴다', statusKey: 'TODO' },
];

const comments = [{
  id: 1,
  content: '재현 확인함. 스테이징 경로에서만 발생하며 라이브 경로는 정상이었다. 로그를 첨부한다.',
  author: { username: 'ysk' }, createdAt: '2026-09-01T10:00:00',
}];

const frame = (over = {}) => render(
  <Detail card={card} subtasks={subtasks} comments={comments}
          statusName="진행 중" width={WIDTH} loading={false} {...over} />
).lastFrame();

describe('Detail', () => {
  it('일감 번호와 제목을 보여준다', () => {
    const f = frame();
    expect(f).toContain('#1902');
    expect(f).toContain('커스텀 SQL');
  });

  it('상태 이름을 보여준다', () => {
    expect(frame()).toContain('진행 중');
  });

  it('담당자를 보여준다', () => {
    expect(frame()).toContain('ysk');
  });

  it('하위 일감의 완료 여부를 표시한다', () => {
    const f = frame();
    expect(f).toContain('스키마 정의');
    expect(f).toContain('배치 등록 처리');
  });

  it('댓글 내용을 보여준다', () => {
    expect(frame()).toContain('재현 확인함');
  });

  it('카드가 없으면 안내 문구를 보여준다', () => {
    expect(frame({ card: null })).toContain('선택된 일감이 없습니다');
  });

  it('불러오는 중에는 안내를 보여준다', () => {
    expect(frame({ loading: true })).toContain('불러오는 중');
  });

  it('폭을 넘지 않는다', () => {
    for (const line of frame().split('\n')) expect(width(line)).toBeLessThanOrEqual(WIDTH);
  });

  it('한글이 길어도 정해진 줄 수를 넘지 않는다', () => {
    // 번호 1 + 제목 3 + 구분선 1 + 항목 4 + (구분선 1 + 설명 6)
    // + (구분선 1 + 머리 1 + 하위 2) + (구분선 1 + 머리 1 + 댓글 1) = 24
    expect(frame().split('\n').length).toBeLessThanOrEqual(24);
  });
});
