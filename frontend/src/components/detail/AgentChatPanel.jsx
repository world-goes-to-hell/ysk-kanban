import { useState } from 'react';
import { useAgentChat } from '../../hooks/useAgentChat';

const ROLE_LABEL = {
  USER: '나',
  ASSISTANT: '에이전트',
  TOOL_USE: '🔧 도구 호출',
  TOOL_RESULT: '🔧 도구 결과',
};

const ROLE_STYLE = {
  USER: { background: '#eff6ff', borderColor: '#bfdbfe' },
  ASSISTANT: { background: '#f0fdf4', borderColor: '#bbf7d0' },
  TOOL_USE: { background: '#fefce8', borderColor: '#fde68a', fontSize: '0.78rem', color: '#92400e' },
  TOOL_RESULT: { background: '#fafafa', borderColor: '#e5e7eb', fontSize: '0.78rem', color: '#52525b' },
};

export default function AgentChatPanel({ todoId, defaultAgentName = 'agent' }) {
  const { messages, loading, sending, error, send } = useAgentChat(todoId);
  const [input, setInput] = useState('');
  const [agentName, setAgentName] = useState(defaultAgentName);

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    const text = input;
    setInput('');
    try {
      await send(text, agentName);
    } catch (_) {
      setInput(text);
    }
  };

  const renderContent = (m) => {
    if (m.role === 'TOOL_USE') {
      return `${m.toolName}(${m.toolJson || ''})`;
    }
    if (m.role === 'TOOL_RESULT') {
      const truncated = (m.toolJson || '').slice(0, 200);
      return truncated.length < (m.toolJson || '').length
        ? `${m.toolName} → ${truncated}…`
        : `${m.toolName} → ${truncated}`;
    }
    return m.content || '';
  };

  return (
    <div style={{
      border: '1px solid var(--border-medium)',
      borderRadius: 'var(--radius-md)',
      padding: '12px',
      marginTop: '16px',
      background: 'var(--surface-bg, #fff)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <strong style={{ fontSize: '0.9rem' }}>🤖 에이전트 대화</strong>
        <input
          value={agentName}
          onChange={(e) => setAgentName(e.target.value)}
          placeholder="에이전트 이름"
          style={{
            fontSize: '0.78rem',
            padding: '2px 6px',
            border: '1px solid var(--border-light)',
            borderRadius: 'var(--radius-sm)',
            width: '120px',
          }}
        />
      </div>

      <div style={{
        maxHeight: '360px',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        marginBottom: '8px',
      }}>
        {loading && <div style={{ color: '#6b7280', fontSize: '0.8rem' }}>불러오는 중…</div>}
        {!loading && messages.length === 0 && (
          <div style={{ color: '#9ca3af', fontSize: '0.85rem', padding: '8px 4px' }}>
            아직 대화가 없습니다. 메시지를 보내 시작하세요.
          </div>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            style={{
              border: '1px solid',
              borderRadius: 'var(--radius-sm)',
              padding: '6px 10px',
              fontSize: '0.85rem',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              ...(ROLE_STYLE[m.role] || {}),
            }}
          >
            <div style={{ fontSize: '0.72rem', opacity: 0.7, marginBottom: '2px' }}>
              {ROLE_LABEL[m.role] || m.role}
            </div>
            <div>{renderContent(m)}</div>
          </div>
        ))}
        {sending && (
          <div style={{ color: '#6b7280', fontSize: '0.8rem' }}>에이전트 응답 중…</div>
        )}
      </div>

      {error && (
        <div style={{ color: '#dc2626', fontSize: '0.8rem', marginBottom: '6px' }}>
          오류: {error.message}
        </div>
      )}

      <div style={{ display: 'flex', gap: '6px' }}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="메시지를 입력하세요 (Ctrl+Enter 전송)"
          rows={2}
          disabled={sending}
          style={{
            flex: 1,
            padding: '6px 8px',
            border: '1px solid var(--border-medium)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.85rem',
            resize: 'vertical',
          }}
        />
        <button
          onClick={handleSend}
          disabled={sending || !input.trim()}
          style={{
            padding: '6px 14px',
            border: '1px solid var(--border-medium)',
            borderRadius: 'var(--radius-sm)',
            background: sending || !input.trim() ? '#e5e7eb' : 'var(--todo-color, #2563eb)',
            color: sending || !input.trim() ? '#6b7280' : '#fff',
            cursor: sending || !input.trim() ? 'not-allowed' : 'pointer',
            fontSize: '0.85rem',
            whiteSpace: 'nowrap',
          }}
        >
          {sending ? '...' : '전송'}
        </button>
      </div>
    </div>
  );
}
