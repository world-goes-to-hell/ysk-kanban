import { useState, useRef } from 'react';
import CommentItem from './CommentItem';
import ConfirmDialog from '../common/ConfirmDialog';
import MentionInput from '../common/MentionInput';
import { useAuth } from '../../contexts/AuthContext';
import styles from '../../styles/detail.module.css';

export default function CommentSection({ comments, onAdd, onEdit, onDelete, projectId, isMaster }) {
  const { currentUser } = useAuth();
  const [input, setInput] = useState('');
  const [pendingFiles, setPendingFiles] = useState([]);
  const [confirmId, setConfirmId] = useState(null);
  const fileInputRef = useRef(null);

  const handleAdd = () => {
    const content = input.trim();
    if (!content && pendingFiles.length === 0) return;
    onAdd(content || '(첨부파일)', pendingFiles.length > 0 ? pendingFiles : undefined);
    setInput('');
    setPendingFiles([]);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAdd();
    }
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = () => {
    const files = Array.from(fileInputRef.current.files);
    if (files.length > 0) {
      setPendingFiles(prev => [...prev, ...files]);
    }
    fileInputRef.current.value = '';
  };

  const removePendingFile = (idx) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== idx));
  };

  return (
    <div className={styles.commentSection}>
      <h3 className={styles.sectionTitle}>댓글</h3>
      <div className={styles.commentList}>
        {comments.length === 0 ? (
          <p className={styles.commentEmpty}>댓글이 없습니다.</p>
        ) : (
          [...comments].reverse().map(c => (
            <CommentItem
              key={c.id}
              comment={c}
              currentUser={currentUser}
              onEdit={onEdit}
              onDelete={(id) => setConfirmId(id)}
              isMaster={isMaster}
            />
          ))
        )}
      </div>
      <div className={styles.commentForm}>
        <MentionInput
          value={input}
          onChange={setInput}
          onSubmit={handleAdd}
          placeholder="댓글을 입력하세요... (@로 멘션)"
          projectId={projectId}
          currentUsername={currentUser?.username}
        />
        <button className={styles.clipBtn} onClick={handleFileSelect} title="파일 첨부">
          &#128206;
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="*/*"
          hidden
          onChange={handleFileChange}
        />
        <button className="btn btn-primary btn-sm" onClick={handleAdd}>댓글 등록</button>
      </div>
      {pendingFiles.length > 0 && (
        <div className={styles.pendingFiles}>
          {pendingFiles.map((f, i) => (
            <span key={i} className={styles.pendingFile}>
              {f.name}
              <button className={styles.pendingFileRemove} onClick={() => removePendingFile(i)}>&times;</button>
            </span>
          ))}
        </div>
      )}

      {confirmId && (
        <ConfirmDialog
          message="이 댓글을 삭제하시겠습니까?"
          onConfirm={() => { onDelete(confirmId); setConfirmId(null); }}
          onCancel={() => setConfirmId(null)}
        />
      )}
    </div>
  );
}
