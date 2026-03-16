import { useState, useRef } from 'react';
import { useTodos } from '../../hooks/useTodos';
import attachmentAPI from '../../api/attachments';
import todoAPI from '../../api/todos';
import { useToast } from '../../hooks/useToast';
import Modal from '../common/Modal';
import TodoForm from './TodoForm';

export default function TodoModal({ mode = 'create', item = null, projectId, initialStatus, onClose, onSaved }) {
  const { createTodo, updateTodo } = useTodos();
  const showToast = useToast();
  const [saving, setSaving] = useState(false);
  const [pendingFiles, setPendingFiles] = useState([]);
  const [deleteQueue, setDeleteQueue] = useState([]);
  const formRef = useRef(null);
  const isEdit = mode === 'edit' && item;

  const handleSave = async () => {
    if (!formRef.current?.validate()) return;
    const data = formRef.current.getData();

    setSaving(true);
    try {
      if (isEdit) {
        await updateTodo(item.id, {
          summary: data.summary,
          description: data.description,
          priority: data.priority,
          projectId: data.projectId,
          dueDate: data.dueDate || null,
          assigneeIds: data.assigneeIds || [],
        });
        // Delete queued attachments
        for (const attId of deleteQueue) {
          try {
            await attachmentAPI.delete(item.id, attId);
          } catch (err) {
            showToast(`첨부파일 삭제 실패`, 'error');
          }
        }
        // Upload new files
        if (pendingFiles.length > 0) {
          for (const file of pendingFiles) {
            try {
              await attachmentAPI.upload(item.id, file);
            } catch (err) {
              showToast(`파일 업로드 실패: ${file.name}`, 'error');
            }
          }
        }
      } else {
        const saved = await createTodo(data);
        if (saved?.id) {
          // 초기 상태가 TODO가 아니면 상태 변경
          if (initialStatus && initialStatus !== 'TODO') {
            try {
              await todoAPI.changeStatus(saved.id, initialStatus);
            } catch (err) {
              showToast(`상태 변경 실패: ${err.message}`, 'error');
            }
          }
          // Upload pending files
          if (pendingFiles.length > 0) {
            for (const file of pendingFiles) {
              try {
                await attachmentAPI.upload(saved.id, file);
              } catch (err) {
                showToast(`파일 업로드 실패: ${file.name}`, 'error');
              }
            }
          }
        }
      }
      onClose();
      onSaved?.();
    } catch (_) {
      // toast handled in hooks
    } finally {
      setSaving(false);
    }
  };

  const footer = (
    <>
      <button className="btn btn-ghost" onClick={onClose}>취소</button>
      <button className="btn btn-primary" onClick={handleSave} disabled={saving}>저장</button>
    </>
  );

  return (
    <Modal
      title={isEdit ? '일감 편집' : '새 일감'}
      onClose={onClose}
      footer={footer}
    >
      <TodoForm
        item={item}
        projectId={projectId}
        isEdit={isEdit}
        pendingFiles={pendingFiles}
        setPendingFiles={setPendingFiles}
        deleteQueue={deleteQueue}
        setDeleteQueue={setDeleteQueue}
        formRef={formRef}
      />
    </Modal>
  );
}
