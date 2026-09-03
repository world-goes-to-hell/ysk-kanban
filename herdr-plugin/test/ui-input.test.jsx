import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import { Input } from '../src/ui/Input.jsx';
import { Help } from '../src/ui/Help.jsx';
import { width } from '../src/text.js';

const lines = (frame) => frame.split('\n');
const widestOf = (frame) => Math.max(...lines(frame).map(width));

describe('Input', () => {
  it('제목과 입력값을 보여준다', () => {
    const f = render(<Input title="검색" value="배치" />).lastFrame();
    expect(f).toContain('검색');
    expect(f).toContain('배치');
  });

  it('값이 비면 안내 문구를 보여준다', () => {
    const f = render(<Input title="댓글" value="" placeholder="내용을 입력하세요" />).lastFrame();
    expect(f).toContain('내용을 입력하세요');
  });

  it('긴 한글 입력값도 폭과 줄 수를 지킨다', () => {
    const short = render(<Input title="검색" value="배치" width={40} />).lastFrame();
    const long = render(
      <Input title="제목으로 검색할 낱말을 입력하십시오"
             value="배치 등록에서 파라미터가 누락되어 발생하는 오류" width={40} />
    ).lastFrame();

    expect(lines(long).length).toBe(lines(short).length);
    expect(widestOf(long)).toBeLessThanOrEqual(40);
  });
});

describe('Help', () => {
  it('남아 있는 기능의 키를 모두 보여준다', () => {
    const f = render(<Help />).lastFrame();
    for (const k of ['j / k', 'h / l', 'g / G', 'Tab', 'Enter', '/', 'f', 'p', 'r',
                     'Space', 'H / L', 'm', '?', 'q']) {
      expect(f).toContain(k);
    }
  });

  it('빠진 기능은 도움말에도 없다', () => {
    // 키 문자만으로는 검사할 수 없다. 'Enter' 안에도 n 과 e 가 들어 있기 때문이다.
    // 그래서 기능 이름으로 확인한다.
    const f = render(<Help />).lastFrame();
    for (const gone of ['새 일감', '하위 일감', '수정', '댓글', '삭제']) {
      expect(f).not.toContain(gone);
    }
  });

  it('폭을 좁혀도 폭과 줄 수를 지킨다', () => {
    const wide = render(<Help width={44} />).lastFrame();
    const narrow = render(<Help width={24} />).lastFrame();

    expect(lines(narrow).length).toBe(lines(wide).length);
    expect(widestOf(narrow)).toBeLessThanOrEqual(24);
  });
});
