import { useCallback } from 'react';
import styles from '../../styles/markdownToolbar.module.css';

export default function MarkdownToolbar({ textareaRef, value, onChange }) {
  const wrap = useCallback((before, after, placeholder) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = value.substring(start, end);
    const inner = selected || placeholder;
    const next = value.substring(0, start) + before + inner + after + value.substring(end);
    onChange(next);
    requestAnimationFrame(() => {
      textarea.focus();
      const cursorStart = start + before.length;
      const cursorEnd = cursorStart + inner.length;
      textarea.setSelectionRange(cursorStart, cursorEnd);
    });
  }, [textareaRef, value, onChange]);

  const prefixLine = useCallback((prefix) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const lineStart = value.lastIndexOf('\n', start - 1) + 1;
    const sameLine = lineStart === value.lastIndexOf('\n', end - 1) + 1;
    if (sameLine) {
      const next = value.substring(0, lineStart) + prefix + value.substring(lineStart);
      onChange(next);
      requestAnimationFrame(() => {
        textarea.focus();
        textarea.setSelectionRange(start + prefix.length, end + prefix.length);
      });
    } else {
      const block = value.substring(lineStart, end);
      const lines = block.split('\n');
      const prefixed = lines.map(line => prefix + line).join('\n');
      const next = value.substring(0, lineStart) + prefixed + value.substring(end);
      onChange(next);
      requestAnimationFrame(() => {
        textarea.focus();
        textarea.setSelectionRange(lineStart, lineStart + prefixed.length);
      });
    }
  }, [textareaRef, value, onChange]);

  const insertBlock = useCallback((block, selectionOffset) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const next = value.substring(0, start) + block + value.substring(start);
    onChange(next);
    requestAnimationFrame(() => {
      textarea.focus();
      const target = start + (selectionOffset ?? block.length);
      textarea.setSelectionRange(target, target);
    });
  }, [textareaRef, value, onChange]);

  return (
    <div className={styles.toolbar} role="toolbar" aria-label="마크다운 서식">
      <button type="button" className={styles.btn} title="굵게  Ctrl+B" onClick={() => wrap('**', '**', '강조')}>
        <strong>B</strong>
      </button>
      <button type="button" className={styles.btn} title="기울임  Ctrl+I" onClick={() => wrap('*', '*', '기울임')}>
        <em>I</em>
      </button>
      <button type="button" className={styles.btn} title="취소선" onClick={() => wrap('~~', '~~', '취소선')}>
        <span style={{ textDecoration: 'line-through' }}>S</span>
      </button>
      <span className={styles.divider} aria-hidden="true" />
      <button type="button" className={styles.btn} title="제목" onClick={() => prefixLine('## ')}>H</button>
      <button type="button" className={styles.btn} title="목록" onClick={() => prefixLine('- ')}>•</button>
      <button type="button" className={styles.btn} title="번호 목록" onClick={() => prefixLine('1. ')}>1.</button>
      <button type="button" className={styles.btn} title="체크박스" onClick={() => prefixLine('- [ ] ')}>☐</button>
      <button type="button" className={styles.btn} title="인용" onClick={() => prefixLine('> ')}>❝</button>
      <span className={styles.divider} aria-hidden="true" />
      <button type="button" className={styles.btn} title="인라인 코드" onClick={() => wrap('`', '`', 'code')}>
        <code>&lt;/&gt;</code>
      </button>
      <button type="button" className={styles.btn} title="코드 블록" onClick={() => wrap('\n```\n', '\n```\n', 'code')}>
        <code>{'{ }'}</code>
      </button>
      <button type="button" className={styles.btn} title="링크" onClick={() => wrap('[', '](url)', '텍스트')}>🔗</button>
      <button
        type="button"
        className={styles.btn}
        title="표"
        onClick={() => insertBlock('\n| 열1 | 열2 |\n| --- | --- |\n| 값1 | 값2 |\n', 3)}
      >
        ⊞
      </button>
      <button
        type="button"
        className={styles.btn}
        title="구분선"
        onClick={() => insertBlock('\n---\n')}
      >
        ―
      </button>
    </div>
  );
}
