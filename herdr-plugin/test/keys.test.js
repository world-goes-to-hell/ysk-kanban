import { describe, it, expect } from 'vitest';
import { resolveKey } from '../src/input/keys.js';

const NONE = {};

describe('이동 키', () => {
  it('j 와 아래 화살표는 같은 뜻이다', () => {
    expect(resolveKey('j', NONE)).toEqual({ type: 'move-down' });
    expect(resolveKey('', { downArrow: true })).toEqual({ type: 'move-down' });
  });

  it('k 와 위 화살표는 같은 뜻이다', () => {
    expect(resolveKey('k', NONE)).toEqual({ type: 'move-up' });
    expect(resolveKey('', { upArrow: true })).toEqual({ type: 'move-up' });
  });

  it('h/l 은 칸 이동이다', () => {
    expect(resolveKey('h', NONE)).toEqual({ type: 'move-left' });
    expect(resolveKey('l', NONE)).toEqual({ type: 'move-right' });
  });

  it('g/G 는 칸의 처음과 끝이다', () => {
    expect(resolveKey('g', NONE)).toEqual({ type: 'column-first' });
    expect(resolveKey('G', NONE)).toEqual({ type: 'column-last' });
  });
});

describe('대소문자 구분', () => {
  it('H/L 은 카드를 옆 칸으로 옮긴다', () => {
    expect(resolveKey('H', NONE)).toEqual({ type: 'move-status-left' });
    expect(resolveKey('L', NONE)).toEqual({ type: 'move-status-right' });
  });

  it('e 는 폼 수정, E 는 에디터 수정이다', () => {
    expect(resolveKey('e', NONE)).toEqual({ type: 'edit' });
    expect(resolveKey('E', NONE)).toEqual({ type: 'edit-description' });
  });
});

describe('특수 키', () => {
  it('Enter 는 상세를 연다', () => {
    expect(resolveKey('', { return: true })).toEqual({ type: 'open-detail' });
  });

  it('Tab 은 포커스를 옮긴다', () => {
    expect(resolveKey('', { tab: true })).toEqual({ type: 'toggle-focus' });
  });

  it('Space 는 상태 변경이다', () => {
    expect(resolveKey(' ', NONE)).toEqual({ type: 'change-status' });
  });
});

describe('안전장치', () => {
  it('Ctrl 조합은 무시한다', () => {
    expect(resolveKey('c', { ctrl: true })).toBeNull();
    expect(resolveKey('n', { ctrl: true })).toBeNull();
  });

  it('메타 조합은 무시한다', () => {
    expect(resolveKey('q', { meta: true })).toBeNull();
  });

  it('모르는 키는 null 이다', () => {
    expect(resolveKey('Z', NONE)).toBeNull();
  });
});
