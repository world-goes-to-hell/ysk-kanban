import { describe, it, expect } from 'vitest';
import { width, truncate, truncateStart, wrap } from '../src/text.js';

describe('width', () => {
  it('영문만 있을 때 폭과 글자 수가 같다', () => {
    expect(width('hello world')).toBe('hello world'.length);
    expect(width('hello world')).toBe(11);
  });

  it('한글은 한 글자가 두 칸이다', () => {
    expect(width('한글')).toBe(4);
    expect(width('가나다라마')).toBe(10);
  });
});

describe('truncate', () => {
  it('폭 기준으로 자른다', () => {
    // 한글 10자(폭 20)를 폭 10 으로 자르면 … 한 칸을 빼고 4자만 남는다
    expect(truncate('가나다라마바사아자차', 10)).toBe('가나다라…');
    expect(width(truncate('가나다라마바사아자차', 10))).toBeLessThanOrEqual(10);
  });

  it('경계에 걸친 한글 글자를 반으로 자르지 않는다', () => {
    // 폭 7 에서 … 를 빼면 6 이 남아 세 글자까지만 들어간다
    const out = truncate('가나다라마바사', 7);
    expect(out).toBe('가나다…');
    expect(width(out)).toBeLessThanOrEqual(7);
  });

  it('자를 필요가 없으면 원문 그대로 돌려준다', () => {
    expect(truncate('짧다', 10)).toBe('짧다');
    expect(truncate('hello', 5)).toBe('hello');
  });
});

describe('truncateStart', () => {
  it('폭을 넘으면 앞을 자르고 … 를 붙인다', () => {
    // 한글 10자(폭 20)를 폭 10 으로 줄이면 … 한 칸을 빼고 뒤쪽 4자만 남는다
    expect(truncateStart('가나다라마바사아자차', 10)).toBe('…사아자차');
    expect(width(truncateStart('가나다라마바사아자차', 10))).toBeLessThanOrEqual(10);
  });

  it('자를 필요가 없으면 원문 그대로 돌려준다', () => {
    expect(truncateStart('짧다', 10)).toBe('짧다');
    expect(truncateStart('hello', 5)).toBe('hello');
  });

  it('경계에 걸친 한글 글자를 반으로 자르지 않는다', () => {
    const out = truncateStart('가나다라마바사', 7);
    expect(out).toBe('…마바사');
    expect(width(out)).toBeLessThanOrEqual(7);
  });

  it('마지막 글자가 항상 보존된다', () => {
    // 입력창은 방금 친 끝부분이 보여야 하므로 이것이 가장 중요하다
    for (const maxWidth of [2, 3, 5, 8, 13, 21]) {
      const out = truncateStart('가나다라마바사아자차', maxWidth);
      expect(out.at(-1)).toBe('차');
      expect(width(out)).toBeLessThanOrEqual(maxWidth);
    }
  });
});

describe('wrap', () => {
  it('폭 기준으로 줄을 나눈다', () => {
    expect(wrap('가나다라마바', 6)).toEqual(['가나다', '라마바']);
  });

  it('maxLines 를 넘으면 마지막 줄에 … 를 붙인다', () => {
    const lines = wrap('가나다라마바사아자', 6, 2);
    expect(lines).toHaveLength(2);
    expect(lines[0]).toBe('가나다');
    expect(lines[1]).toBe('라마…');
    for (const line of lines) expect(width(line)).toBeLessThanOrEqual(6);
  });
});
