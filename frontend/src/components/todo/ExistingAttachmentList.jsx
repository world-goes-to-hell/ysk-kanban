import { useState, useEffect } from 'react';
import attachmentAPI from '../../api/attachments';

const gridStyle = { display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' };
const thumbStyle = {
  width: '72px', height: '72px', borderRadius: 'var(--radius-sm)',
  overflow: 'hidden', border: '1px solid var(--border-light)',
  position: 'relative', cursor: 'pointer',
  transition: 'opacity var(--duration-fast)',
};
const imgStyle = { width: '100%', height: '100%', objectFit: 'cover' };
const deleteBtnStyle = {
  position: 'absolute', top: '2px', right: '2px',
  width: '18px', height: '18px', display: 'flex',
  alignItems: 'center', justifyContent: 'center',
  fontSize: '0.6rem', color: '#fff',
  background: 'rgba(220, 38, 38, 0.85)',
  border: 'none', borderRadius: '50%',
  cursor: 'pointer',
};
const pendingDeleteStyle = { opacity: 0.35, filter: 'grayscale(1)' };
const restoreBtnStyle = {
  position: 'absolute', bottom: '2px', left: '50%', transform: 'translateX(-50%)',
  fontSize: '0.6rem', color: '#fff', background: 'rgba(37,99,235,0.85)',
  border: 'none', borderRadius: '3px', padding: '1px 6px', cursor: 'pointer',
};

export default function ExistingAttachmentList({ todoId, deleteQueue, setDeleteQueue }) {
  const [attachments, setAttachments] = useState([]);

  useEffect(() => {
    if (!todoId) return;
    attachmentAPI.list(todoId).then(data => {
      setAttachments(Array.isArray(data) ? data : []);
    }).catch(() => setAttachments([]));
  }, [todoId]);

  if (attachments.length === 0) return null;

  const isQueued = (id) => deleteQueue.includes(id);

  const toggleDelete = (id) => {
    if (isQueued(id)) {
      setDeleteQueue(prev => prev.filter(x => x !== id));
    } else {
      setDeleteQueue(prev => [...prev, id]);
    }
  };

  return (
    <div>
      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
        기존 첨부파일 ({attachments.length}개)
      </div>
      <div style={gridStyle}>
        {attachments.map(att => {
          const url = attachmentAPI.getUrl(todoId, att.id);
          const queued = isQueued(att.id);
          return (
            <div
              key={att.id}
              style={{ ...thumbStyle, ...(queued ? pendingDeleteStyle : {}) }}
              title={att.originalFilename || '첨부파일'}
            >
              <img src={url} alt={att.originalFilename || ''} style={imgStyle} loading="lazy" />
              {queued ? (
                <button style={restoreBtnStyle} onClick={() => toggleDelete(att.id)}>복원</button>
              ) : (
                <button style={deleteBtnStyle} onClick={() => toggleDelete(att.id)}>&times;</button>
              )}
            </div>
          );
        })}
      </div>
      {deleteQueue.length > 0 && (
        <div style={{ fontSize: '0.72rem', color: 'var(--danger)', marginTop: '6px' }}>
          {deleteQueue.length}개 파일 삭제 예정 (저장 시 적용)
        </div>
      )}
    </div>
  );
}
