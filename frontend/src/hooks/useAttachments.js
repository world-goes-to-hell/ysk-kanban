import { useState, useCallback } from 'react';
import attachmentAPI from '../api/attachments';
import { useToast } from './useToast';
import { useLoading } from './useLoading';

export function useAttachments(todoId) {
  const [attachments, setAttachments] = useState([]);
  const showToast = useToast();
  const { showLoading, hideLoading } = useLoading();

  const loadAttachments = useCallback(async () => {
    if (!todoId) return;
    try {
      const data = await attachmentAPI.list(todoId);
      setAttachments(Array.isArray(data) ? data : []);
    } catch (_) {
      setAttachments([]);
    }
  }, [todoId]);

  const uploadFile = useCallback(async (file) => {
    if (!todoId) return;
    showLoading();
    try {
      await attachmentAPI.upload(todoId, file);
    } catch (err) {
      showToast(`파일 업로드 실패: ${file.name}`, 'error');
    } finally {
      hideLoading();
    }
  }, [todoId, showLoading, hideLoading, showToast]);

  const deleteAttachment = useCallback(async (attId) => {
    if (!todoId) return;
    showLoading();
    try {
      await attachmentAPI.delete(todoId, attId);
      showToast('첨부파일이 삭제되었습니다.', 'success');
      await loadAttachments();
    } catch (err) {
      showToast(`첨부파일 삭제에 실패했습니다: ${err.message}`, 'error');
    } finally {
      hideLoading();
    }
  }, [todoId, showLoading, hideLoading, showToast, loadAttachments]);

  const getUrl = useCallback((attId) => {
    return attachmentAPI.getUrl(todoId, attId);
  }, [todoId]);

  return { attachments, loadAttachments, uploadFile, deleteAttachment, getUrl };
}
