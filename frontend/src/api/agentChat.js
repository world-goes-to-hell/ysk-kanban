import { apiFetch } from './client';

const agentChatAPI = {
  list: (todoId) =>
    apiFetch(`/api/todos/${todoId}/agent/messages`),

  send: (todoId, message, agentName) =>
    apiFetch(`/api/todos/${todoId}/agent/message`, {
      method: 'POST',
      body: JSON.stringify({ message, agentName }),
    }),
};

export default agentChatAPI;
