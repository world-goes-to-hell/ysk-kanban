import { apiFetch } from './client';

const commentAttachmentAPI = {
  list: (commentId) => apiFetch(`/api/comments/${commentId}/attachments`),
  upload: (commentId, file) => {
    const fd = new FormData();
    fd.append('file', file);
    return apiFetch(`/api/comments/${commentId}/attachments`, { method: 'POST', body: fd });
  },
  getUrl: (commentId, attId) => `/api/comments/${commentId}/attachments/${attId}`,
  delete: (commentId, attId) => apiFetch(`/api/comments/${commentId}/attachments/${attId}`, { method: 'DELETE' }),
};

export default commentAttachmentAPI;
