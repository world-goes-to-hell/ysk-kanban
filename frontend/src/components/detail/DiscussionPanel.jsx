import { useState, useEffect, useCallback, useRef } from 'react';
import discussionAPI from '../../api/discussions';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../../contexts/AuthContext';
import { loadJitsiScript, extractRoomName, extractDomain } from '../../utils/jitsi';
import Modal from '../common/Modal';
import styles from '../../styles/discussionPanel.module.css';

function formatTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) {
    return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function DiscussionPanel({ todoId, isMaster, onActiveChange }) {
  const showToast = useToast();
  const { currentUser } = useAuth();
  const [discussions, setDiscussions] = useState([]);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [jitsiError, setJitsiError] = useState(null);
  const [leftPct, setLeftPct] = useState(() => {
    if (typeof window === 'undefined') return 58;
    const saved = Number(localStorage.getItem('discussionLeftPct'));
    return Number.isFinite(saved) && saved >= 25 && saved <= 80 ? saved : 58;
  });
  const [popoutFull, setPopoutFull] = useState(false);
  const [viewingDiscussion, setViewingDiscussion] = useState(null);
  const [viewingMessages, setViewingMessages] = useState([]);
  const [viewingLoading, setViewingLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const jitsiContainerRef = useRef(null);
  const jitsiApiRef = useRef(null);
  const gridRef = useRef(null);

  const handleResizeMouseDown = (e) => {
    e.preventDefault();
    if (!gridRef.current) return;
    const iframe = jitsiContainerRef.current?.querySelector('iframe');
    if (iframe) iframe.style.pointerEvents = 'none';
    const onMove = (ev) => {
      const rect = gridRef.current?.getBoundingClientRect();
      if (!rect || rect.width === 0) return;
      const pct = ((ev.clientX - rect.left) / rect.width) * 100;
      const clamped = Math.max(25, Math.min(80, pct));
      setLeftPct(clamped);
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      if (iframe) iframe.style.pointerEvents = '';
    };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('discussionLeftPct', String(Math.round(leftPct)));
  }, [leftPct]);

  const togglePopoutFull = () => {
    setPopoutFull(prev => !prev);
  };

  const handleViewHistory = async (discussion) => {
    setViewingDiscussion(discussion);
    setViewingLoading(true);
    setViewingMessages([]);
    try {
      const msgs = await discussionAPI.listMessages(discussion.id);
      setViewingMessages(Array.isArray(msgs) ? msgs : []);
    } catch (err) {
      showToast(err.message || '토론 내용 조회 실패', 'error');
      setViewingMessages([]);
    } finally {
      setViewingLoading(false);
    }
  };

  const closeViewHistory = () => {
    setViewingDiscussion(null);
    setViewingMessages([]);
  };

  useEffect(() => {
    const onEsc = (e) => {
      if (e.key === 'Escape' && popoutFull) {
        e.stopPropagation();
        setPopoutFull(false);
      }
    };
    window.addEventListener('keydown', onEsc, true);
    return () => window.removeEventListener('keydown', onEsc, true);
  }, [popoutFull]);

  const active = discussions.find(d => !d.endedAt);
  const past = discussions.filter(d => d.endedAt);

  const loadDiscussions = useCallback(async () => {
    if (!todoId) return;
    try {
      const list = await discussionAPI.listByTodo(todoId);
      setDiscussions(Array.isArray(list) ? list : []);
    } catch {
      setDiscussions([]);
    }
  }, [todoId]);

  const loadMessages = useCallback(async (discussionId) => {
    if (!discussionId) return;
    try {
      const list = await discussionAPI.listMessages(discussionId);
      setMessages(Array.isArray(list) ? list : []);
    } catch {
      setMessages([]);
    }
  }, []);

  useEffect(() => {
    loadDiscussions();
  }, [loadDiscussions]);

  useEffect(() => {
    if (active?.id) {
      loadMessages(active.id);
    } else {
      setMessages([]);
    }
  }, [active?.id, loadMessages]);

  useEffect(() => {
    onActiveChange?.(!!active);
    return () => onActiveChange?.(false);
  }, [active, onActiveChange]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length]);

  useEffect(() => {
    if (!active?.roomUrl) {
      if (jitsiApiRef.current) {
        try { jitsiApiRef.current.dispose(); } catch { /* ignore */ }
        jitsiApiRef.current = null;
      }
      return undefined;
    }
    let cancelled = false;
    setJitsiError(null);
    loadJitsiScript()
      .then(() => {
        if (cancelled || !jitsiContainerRef.current) return;
        if (jitsiApiRef.current) {
          try { jitsiApiRef.current.dispose(); } catch { /* ignore */ }
          jitsiApiRef.current = null;
        }
        const roomName = extractRoomName(active.roomUrl);
        const domain = extractDomain(active.roomUrl);
        if (!roomName) {
          setJitsiError('잘못된 룸 URL');
          return;
        }
        jitsiApiRef.current = new window.JitsiMeetExternalAPI(domain, {
          roomName,
          parentNode: jitsiContainerRef.current,
          width: '100%',
          height: '100%',
          userInfo: { displayName: currentUser?.displayName || currentUser?.username || '익명' },
          configOverwrite: {
            startWithAudioMuted: true,
            startWithVideoMuted: true,
            prejoinPageEnabled: false,
            disableDeepLinking: true,
          },
          interfaceConfigOverwrite: {
            SHOW_JITSI_WATERMARK: false,
            DISABLE_VIDEO_BACKGROUND: true,
          },
        });
      })
      .catch((err) => {
        if (!cancelled) setJitsiError(err?.message || 'Jitsi 로드 실패');
      });
    return () => {
      cancelled = true;
      if (jitsiApiRef.current) {
        try { jitsiApiRef.current.dispose(); } catch { /* ignore */ }
        jitsiApiRef.current = null;
      }
    };
  }, [active?.id, active?.roomUrl, currentUser?.displayName, currentUser?.username]);

  useEffect(() => {
    const onChatMessage = (e) => {
      if (!active?.id) return;
      if (Number(e.detail?.discussionId) !== Number(active.id)) return;
      setMessages(prev => {
        if (prev.some(m => m.id === e.detail.messageId)) return prev;
        return [...prev, {
          id: e.detail.messageId,
          content: e.detail.content,
          type: 'CHAT',
          discussionId: e.detail.discussionId,
          createdAt: e.detail.createdAt,
          author: { id: e.detail.authorId, displayName: e.detail.authorName },
        }];
      });
    };
    const onDiscussionStarted = (e) => {
      if (Number(e.detail?.todoId) === Number(todoId)) loadDiscussions();
    };
    const onDiscussionEnded = (e) => {
      if (Number(e.detail?.todoId) === Number(todoId)) {
        loadDiscussions();
        if (active?.id && Number(e.detail.discussionId) === Number(active.id)) {
          loadMessages(active.id);
        }
      }
    };
    window.addEventListener('chat_message', onChatMessage);
    window.addEventListener('discussion_started', onDiscussionStarted);
    window.addEventListener('discussion_ended', onDiscussionEnded);
    return () => {
      window.removeEventListener('chat_message', onChatMessage);
      window.removeEventListener('discussion_started', onDiscussionStarted);
      window.removeEventListener('discussion_ended', onDiscussionEnded);
    };
  }, [todoId, active?.id, loadDiscussions, loadMessages]);

  const handleStart = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await discussionAPI.start(todoId);
      showToast('토론이 시작되었습니다', 'success');
      await loadDiscussions();
    } catch (err) {
      showToast(err.message || '토론 시작 실패', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEnd = async () => {
    if (!active || loading) return;
    if (!confirm('정말 토론을 종료하시겠습니까?')) return;
    setLoading(true);
    try {
      await discussionAPI.end(active.id);
      showToast('토론이 종료되었습니다', 'success');
      await loadDiscussions();
    } catch (err) {
      showToast(err.message || '토론 종료 실패', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!active || !input.trim() || loading) return;
    const text = input.trim();
    setInput('');
    try {
      await discussionAPI.postMessage(active.id, text);
    } catch (err) {
      setInput(text);
      showToast(err.message || '메시지 전송 실패', 'error');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const canEnd = active && (
    active.startedBy?.id === currentUser?.id || isMaster
  );

  return (
    <>
      {popoutFull && <div className={styles.popoutBackdrop} onClick={() => setPopoutFull(false)} />}
      <section className={`${styles.section} ${active ? styles.sectionActive : ''} ${popoutFull ? styles.sectionPopout : ''}`}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.title}>토론</span>
          {active && <span className={styles.activeBadge}>🔴 진행 중</span>}
        </div>
        <div className={styles.headerRight}>
          {active && (
            <button
              className={styles.popoutBtn}
              onClick={togglePopoutFull}
              title={popoutFull ? '원래 위치로 복귀 (Esc)' : '토론을 별도 창으로 띄우기'}
              aria-label={popoutFull ? '분할 보기로 복귀' : '별도 창으로 보기'}
            >
              {popoutFull ? '⤡' : '⤢'}
            </button>
          )}
          {!active && (
            <button
              className={styles.startBtn}
              onClick={handleStart}
              disabled={loading}
            >
              토론 시작
            </button>
          )}
          {active && canEnd && (
            <button
              className={styles.endBtn}
              onClick={handleEnd}
              disabled={loading}
            >
              토론 종료
            </button>
          )}
        </div>
      </header>

      {active ? (
        <>
          <div
            ref={gridRef}
            className={styles.activeGrid}
            style={{ ['--left-pct']: leftPct + '%' }}
          >
            <div className={styles.activeLeft}>
              <div className={styles.paneHeader}>
                <span className={styles.paneTitle}>통화 · 화면공유</span>
              </div>
              <div className={styles.jitsiWrap}>
                <div ref={jitsiContainerRef} className={styles.jitsiContainer} />
                {jitsiError && (
                  <div className={styles.jitsiError}>
                    통화 로드 실패: {jitsiError}. <a href={active.roomUrl} target="_blank" rel="noopener noreferrer">새 창에서 열기</a>
                  </div>
                )}
              </div>
              <div className={styles.roomBar}>
                <span className={styles.roomLabel}>통화 룸</span>
                <a
                  className={styles.roomLink}
                  href={active.roomUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {active.roomUrl}
                </a>
                <button
                  className={styles.copyBtn}
                  onClick={() => {
                    navigator.clipboard.writeText(active.roomUrl);
                    showToast('링크를 복사했습니다', 'success');
                  }}
                >
                  복사
                </button>
              </div>
            </div>

            <div
              className={styles.resizer}
              onMouseDown={handleResizeMouseDown}
              role="separator"
              aria-orientation="vertical"
              aria-label="크기 조절"
            >
              <span className={styles.resizerGrip} />
            </div>

            <div className={styles.activeRight}>
              <div className={styles.paneHeader}>
                <span className={styles.paneTitle}>채팅</span>
              </div>
              <div className={styles.messages}>
              {messages.length === 0 ? (
                <div className={styles.empty}>아직 메시지가 없습니다. 첫 메시지를 남겨보세요.</div>
              ) : (
                messages.map(m => (
                  <div
                    key={m.id}
                    className={`${styles.message} ${m.type === 'SYSTEM' ? styles.messageSystem : ''} ${m.author?.id === currentUser?.id ? styles.messageMine : ''}`}
                  >
                    {m.type !== 'SYSTEM' && (
                      <div className={styles.messageHeader}>
                        <span className={styles.messageAuthor}>{m.author?.displayName || m.author?.username || '익명'}</span>
                        <span className={styles.messageTime}>{formatTime(m.createdAt)}</span>
                      </div>
                    )}
                    <div className={styles.messageBody}>{m.content}</div>
                    {m.type === 'SYSTEM' && (
                      <div className={styles.messageTime}>{formatTime(m.createdAt)}</div>
                    )}
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className={styles.composer}>
              <textarea
                className={styles.composerInput}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="메시지 입력 (Enter 전송, Shift+Enter 줄바꿈)"
                rows={2}
              />
              <button
                className={styles.sendBtn}
                onClick={handleSend}
                disabled={!input.trim() || loading}
              >
                전송
              </button>
            </div>
            </div>
          </div>
        </>
      ) : (
        <div className={styles.empty}>
          진행 중인 토론이 없습니다. "토론 시작"을 누르면 채팅 + 통화 룸이 생성됩니다.
        </div>
      )}

      {viewingDiscussion && (
        <Modal
          title={`토론 내용 — ${formatTime(viewingDiscussion.startedAt)} ~ ${formatTime(viewingDiscussion.endedAt)}`}
          wide
          onClose={closeViewHistory}
        >
          <div className={styles.viewerWrap}>
            {viewingLoading ? (
              <div className={styles.empty}>불러오는 중...</div>
            ) : viewingMessages.length === 0 ? (
              <div className={styles.empty}>이 토론에는 채팅 메시지가 없습니다.</div>
            ) : (
              <div className={styles.viewerMessages}>
                {viewingMessages.map(m => (
                  <div
                    key={m.id}
                    className={`${styles.message} ${m.type === 'SYSTEM' ? styles.messageSystem : ''} ${m.author?.id === currentUser?.id ? styles.messageMine : ''}`}
                  >
                    {m.type !== 'SYSTEM' && (
                      <div className={styles.messageHeader}>
                        <span className={styles.messageAuthor}>{m.author?.displayName || m.author?.username || '익명'}</span>
                        <span className={styles.messageTime}>{formatTime(m.createdAt)}</span>
                      </div>
                    )}
                    <div className={styles.messageBody}>{m.content}</div>
                    {m.type === 'SYSTEM' && (
                      <div className={styles.messageTime}>{formatTime(m.createdAt)}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
            <div className={styles.viewerMeta}>
              <span>시작: {viewingDiscussion.startedBy?.displayName} · 통화 룸: </span>
              <a href={viewingDiscussion.roomUrl} target="_blank" rel="noopener noreferrer">
                {viewingDiscussion.roomUrl}
              </a>
            </div>
          </div>
        </Modal>
      )}

      {past.length > 0 && (
        <div className={styles.historyWrap}>
          <button
            className={styles.historyToggle}
            onClick={() => setHistoryOpen(prev => !prev)}
          >
            {historyOpen ? '▾' : '▸'} 지난 토론 {past.length}건
          </button>
          {historyOpen && (
            <ul className={styles.historyList}>
              {past.map(d => (
                <li key={d.id} className={styles.historyItem}>
                  <span className={styles.historyTime}>
                    {formatTime(d.startedAt)} ~ {formatTime(d.endedAt)}
                  </span>
                  <span className={styles.historyStarter}>
                    by {d.startedBy?.displayName}
                  </span>
                  <button
                    className={styles.historyViewBtn}
                    onClick={() => handleViewHistory(d)}
                    title="이 토론의 채팅 내용 보기"
                  >
                    내용 보기
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
    </>
  );
}
