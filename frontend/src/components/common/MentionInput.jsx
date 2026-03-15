import { useState, useEffect, useRef, useCallback } from 'react';
import { fetchUsers } from '../../api/users';
import projectAPI from '../../api/projects';
import styles from '../../styles/mention.module.css';

export default function MentionInput({ value, onChange, onSubmit, placeholder, className, projectId, currentUsername }) {
  const [users, setUsers] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mentionStart, setMentionStart] = useState(-1);
  const [checkedUsers, setCheckedUsers] = useState(new Set());
  const textareaRef = useRef(null);

  useEffect(() => {
    if (projectId) {
      projectAPI.getMembers(projectId)
        .then(members => setUsers(members.map(m => ({
          id: m.user?.id,
          username: m.user?.username,
          displayName: m.user?.displayName,
        })).filter(u => u.id && u.username !== currentUsername)))
        .catch(() => fetchUsers().then(setUsers).catch(() => {}));
    } else {
      fetchUsers().then(list => setUsers(list.filter(u => u.username !== currentUsername))).catch(() => {});
    }
  }, [projectId, currentUsername]);

  const handleChange = (e) => {
    const val = e.target.value;
    const cursorPos = e.target.selectionStart;
    onChange(val);

    const textBeforeCursor = val.substring(0, cursorPos);
    const mentionMatch = textBeforeCursor.match(/(?:^|[^<])@(\w*)$/);

    if (mentionMatch) {
      const query = mentionMatch[1].toLowerCase();
      const start = cursorPos - mentionMatch[0].length;
      setMentionStart(start);
      const alreadyMentioned = new Set(
        (val.match(/<<@(\w+)>>/g) || []).map(m => m.replace(/<<@|>>/g, ''))
      );
      const filtered = users.filter(u =>
        !alreadyMentioned.has(u.username) &&
        (u.username.toLowerCase().includes(query) ||
        (u.displayName && u.displayName.toLowerCase().includes(query)))
      ).slice(0, 10);
      setSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
      setSelectedIndex(0);
      setCheckedUsers(new Set());
    } else {
      setShowSuggestions(false);
      setCheckedUsers(new Set());
    }
  };

  const insertMention = useCallback((user) => {
    const before = value.substring(0, mentionStart);
    const after = value.substring(textareaRef.current.selectionStart);
    const newValue = before + '<<@' + user.username + '>> ' + after;
    onChange(newValue);
    setShowSuggestions(false);
    setCheckedUsers(new Set());
    textareaRef.current.focus();
  }, [value, mentionStart, onChange]);

  const insertMultiple = useCallback(() => {
    if (checkedUsers.size === 0) return;
    const before = value.substring(0, mentionStart);
    const after = value.substring(textareaRef.current.selectionStart);
    const mentions = Array.from(checkedUsers).map(u => '<<@' + u + '>>').join('');
    const newValue = before + mentions + ' ' + after;
    onChange(newValue);
    setShowSuggestions(false);
    setCheckedUsers(new Set());
    textareaRef.current.focus();
  }, [value, mentionStart, checkedUsers, onChange]);

  const toggleCheck = (username) => {
    setCheckedUsers(prev => {
      const next = new Set(prev);
      if (next.has(username)) next.delete(username);
      else next.add(username);
      return next;
    });
  };

  const handleKeyDown = (e) => {
    if (!showSuggestions) {
      if (e.key === 'Enter' && !e.shiftKey && onSubmit) {
        e.preventDefault();
        onSubmit();
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === ' ' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      if (suggestions[selectedIndex]) {
        toggleCheck(suggestions[selectedIndex].username);
      }
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      if (checkedUsers.size > 0) {
        insertMultiple();
      } else if (suggestions[selectedIndex]) {
        insertMention(suggestions[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setCheckedUsers(new Set());
    }
  };

  return (
    <div className={styles.mentionWrapper}>
      <textarea
        ref={textareaRef}
        className={`form-input form-textarea--sm ${className || ''}`}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder || '댓글을 입력하세요... (@로 멘션)'}
      />
      {showSuggestions && (
        <div className={styles.suggestions}>
          {suggestions.map((user, idx) => (
            <div
              key={user.id}
              className={`${styles.suggestionItem} ${idx === selectedIndex ? styles.selected : ''}`}
              onMouseEnter={() => setSelectedIndex(idx)}
            >
              <label
                className={styles.checkArea}
                onClick={(e) => e.stopPropagation()}
              >
                <input
                  type="checkbox"
                  checked={checkedUsers.has(user.username)}
                  onChange={() => toggleCheck(user.username)}
                  className={styles.checkbox}
                />
              </label>
              <div
                className={styles.suggestionInfo}
                onClick={() => insertMention(user)}
              >
                <span className={styles.suggestionName}>{user.displayName || user.username}</span>
                <span className={styles.suggestionUsername}>@{user.username}</span>
              </div>
            </div>
          ))}
          <div className={styles.multiInsert}>
            {checkedUsers.size > 0 ? (
              <>
                <span className={styles.multiCount}>{checkedUsers.size}명 선택</span>
                <button className={styles.multiBtn} onClick={insertMultiple}>삽입</button>
              </>
            ) : (
              <span className={styles.multiHint}>Ctrl+Space: 다중 선택</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
