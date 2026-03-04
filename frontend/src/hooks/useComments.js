import { useState, useCallback } from 'react';
import commentAPI from '../api/comments';
import commentAttachmentAPI from '../api/commentAttachments';
import { useToast } from './useToast';
import { useLoading } from './useLoading';

export function useComments(todoId) {
  const [comments, setComments] = useState([]);
  const showToast = useToast();
  const { showLoading, hideLoading } = useLoading();

  const loadComments = useCallback(async () => {
    if (!todoId) return;
    try {
      const data = await commentAPI.list(todoId);
      setComments(Array.isArray(data) ? data : []);
    } catch (_) {
      setComments([]);
    }
  }, [todoId]);

  const addComment = useCallback(async (content, files) => {
    if (!todoId) return;
    showLoading();
    try {
      const created = await commentAPI.create(todoId, content);
      // Upload attached files to the comment
      if (created?.id && files && files.length > 0) {
        for (const file of files) {
          try {
            await commentAttachmentAPI.upload(created.id, file);
          } catch (err) {
            showToast(`파일 업로드 실패: ${file.name}`, 'error');
          }
        }
      }
      showToast('댓글이 등록되었습니다.', 'success');
      await loadComments();
    } catch (err) {
      showToast(`댓글 등록에 실패했습니다: ${err.message}`, 'error');
    } finally {
      hideLoading();
    }
  }, [todoId, showLoading, hideLoading, showToast, loadComments]);

  const updateComment = useCallback(async (commentId, content) => {
    if (!todoId) return;
    showLoading();
    try {
      await commentAPI.update(todoId, commentId, content);
      showToast('댓글이 수정되었습니다.', 'success');
      await loadComments();
    } catch (err) {
      showToast(`댓글 수정에 실패했습니다: ${err.message}`, 'error');
    } finally {
      hideLoading();
    }
  }, [todoId, showLoading, hideLoading, showToast, loadComments]);

  const deleteComment = useCallback(async (commentId) => {
    if (!todoId) return;
    showLoading();
    try {
      await commentAPI.delete(todoId, commentId);
      showToast('댓글이 삭제되었습니다.', 'success');
      await loadComments();
    } catch (err) {
      showToast(`댓글 삭제에 실패했습니다: ${err.message}`, 'error');
    } finally {
      hideLoading();
    }
  }, [todoId, showLoading, hideLoading, showToast, loadComments]);

  return { comments, loadComments, addComment, updateComment, deleteComment };
}
