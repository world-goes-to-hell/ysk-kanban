// herdr-plugin/src/input/keys.js

const BY_CHAR = {
  j: 'move-down',   k: 'move-up',
  h: 'move-left',   l: 'move-right',
  g: 'column-first', G: 'column-last',
  H: 'move-status-left', L: 'move-status-right',
  n: 'new',  s: 'subtask',
  e: 'edit', E: 'edit-description',
  c: 'comment', x: 'delete',
  p: 'project', r: 'refresh',
  m: 'toggle-mouse', '?': 'help', q: 'quit',
  '/': 'search', f: 'filter',
  ' ': 'change-status',
};

/**
 * 키 입력을 동작으로 바꾼다. 순수 함수이므로 테스트하기 쉽다.
 * Ctrl·Meta 조합은 터미널과 Herdr 가 쓰므로 가로채지 않는다.
 */
export function resolveKey(input, key) {
  if (key.ctrl || key.meta || key.super || key.hyper) return null;

  if (key.downArrow) return { type: 'move-down' };
  if (key.upArrow) return { type: 'move-up' };
  if (key.leftArrow) return { type: 'move-left' };
  if (key.rightArrow) return { type: 'move-right' };
  if (key.return) return { type: 'open-detail' };
  if (key.tab) return { type: 'toggle-focus' };
  if (key.escape) return { type: 'close-modal' };

  const type = BY_CHAR[input];
  return type ? { type } : null;
}
