import { useCallback, useEffect, useState } from 'react';
import agentChatAPI from '../api/agentChat';

export function useAgentChat(todoId) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!todoId) {
      setMessages([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await agentChatAPI.list(todoId);
      setMessages(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [todoId]);

  useEffect(() => {
    load();
  }, [load]);

  const send = useCallback(async (message, agentName) => {
    if (!todoId || !message?.trim() || sending) return;
    setSending(true);
    setError(null);
    try {
      await agentChatAPI.send(todoId, message.trim(), agentName);
      await load();
    } catch (e) {
      setError(e);
      throw e;
    } finally {
      setSending(false);
    }
  }, [todoId, sending, load]);

  return { messages, loading, sending, error, send, reload: load };
}
