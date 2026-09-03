import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import { Palette } from '../src/ui/Palette.jsx';
import { Confirm } from '../src/ui/Confirm.jsx';
import { width } from '../src/text.js';

const items = [
  { id: 'TODO', label: '할 일', color: '#2563EB' },
  { id: 'DONE', label: '완료', color: '#059669' },
];

const lines = (frame) => frame.split('\n');
const widestOf = (frame) => Math.max(...lines(frame).map(width));

describe('Palette', () => {
  it('제목과 항목을 보여준다', () => {
    const f = render(<Palette title="상태 변경" items={items} selectedIndex={0} />).lastFrame();
    expect(f).toContain('상태 변경');
    expect(f).toContain('할 일');
    expect(f).toContain('완료');
  });

  it('선택한 항목에 표시를 붙인다', () => {
    const f = render(<Palette title="상태 변경" items={items} selectedIndex={1} />).lastFrame();
    const line = lines(f).find(l => l.includes('완료'));
    expect(line).toMatch(/[>›▸]/);
  });

  it('항목이 없으면 안내를 보여준다', () => {
    const f = render(<Palette title="상태 변경" items={[]} selectedIndex={0} />).lastFrame();
    expect(f).toContain('항목이 없습니다');
  });

  it('긴 한글 제목과 항목도 폭과 줄 수를 지킨다', () => {
    // 한글은 한 칸이 아니라 두 칸이라 slice 로 자르면 폭이 어긋난다.
    // 제대로 잘렸다면 줄 수가 짧은 쪽과 같아야 한다.
    const short = render(
      <Palette title="상태" items={[{ id: 'A', label: '가' }]} selectedIndex={0} width={40} />
    ).lastFrame();
    const long = render(
      <Palette
        title="지금 고른 일감의 상태를 어느 칸으로 옮길지 고르십시오"
        items={[{ id: 'A', label: '검토 대기 중이며 담당자 배정을 기다리는 중인 칸' }]}
        selectedIndex={0} width={40} />
    ).lastFrame();

    expect(lines(long).length).toBe(lines(short).length);
    expect(widestOf(long)).toBeLessThanOrEqual(40);
  });
});

describe('Confirm', () => {
  it('메시지와 선택지를 보여준다', () => {
    const f = render(<Confirm message="삭제할까요?" detail="하위 2건이 함께 지워집니다" />).lastFrame();
    expect(f).toContain('삭제할까요?');
    expect(f).toContain('하위 2건');
    expect(f).toContain('y');
    expect(f).toContain('n');
  });

  it('긴 한글 메시지도 폭과 줄 수를 지킨다', () => {
    const short = render(<Confirm message="옮길까요?" detail="확인" width={40} />).lastFrame();
    const long = render(
      <Confirm
        message="아직 끝내지 않은 하위 일감이 남아 있는데 완료 칸으로 옮길까요?"
        detail="하위 일감 세 건이 아직 완료되지 않았으며 되돌릴 수 없습니다"
        width={40} />
    ).lastFrame();

    expect(lines(long).length).toBe(lines(short).length);
    expect(widestOf(long)).toBeLessThanOrEqual(40);
  });
});
