#!/usr/bin/env node
// herdr-plugin/src/cli.js
console.log('herdr-kanban 기동 확인');
console.log('plugin root:', process.env.HERDR_PLUGIN_ROOT ?? '(없음)');
console.log('pane id    :', process.env.HERDR_PANE_ID ?? '(없음)');
console.log('터미널 크기:', process.stdout.columns, 'x', process.stdout.rows);
console.log('아무 키나 누르면 종료합니다.');
process.stdin.setRawMode?.(true);
process.stdin.resume();
process.stdin.once('data', () => process.exit(0));
