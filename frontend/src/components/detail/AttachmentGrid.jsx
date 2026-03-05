import { useState } from 'react';
import ConfirmDialog from '../common/ConfirmDialog';
import { isImageType, getFileIcon } from '../../utils/fileUtils';
import styles from '../../styles/detail.module.css';

export default function AttachmentGrid({ attachments, getUrl, onDelete }) {
  const [confirmAtt, setConfirmAtt] = useState(null);

  if (!attachments || attachments.length === 0) return null;

  return (
    <>
      <div className={styles.attachSection}>
        <h3 className={styles.sectionTitle}>첨부 파일</h3>
        <div className={styles.attachGrid}>
          {attachments.map(att => {
            const url = getUrl(att.id);
            const image = isImageType(att);
            return (
              <div key={att.id} className={styles.attachThumb}>
                {image ? (
                  <img
                    src={url}
                    alt={att.originalFilename || '첨부파일'}
                    loading="lazy"
                    className={styles.attachImg}
                    onClick={() => window.open(url, '_blank')}
                  />
                ) : (
                  <div className={styles.attachFile} onClick={() => window.open(url, '_blank')}>
                    <span className={styles.attachFileIcon}>{getFileIcon(att.originalFilename)}</span>
                    <span className={styles.attachFileName}>{att.originalFilename || '파일'}</span>
                  </div>
                )}
                <div className={styles.attachOverlay}>
                  {att.originalFilename || '파일'}
                </div>
                <button
                  className={styles.attachDeleteBtn}
                  onClick={(e) => { e.stopPropagation(); setConfirmAtt(att); }}
                >
                  &times;
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {confirmAtt && (
        <ConfirmDialog
          message="이 첨부파일을 삭제하시겠습니까?"
          onConfirm={() => { onDelete(confirmAtt.id); setConfirmAtt(null); }}
          onCancel={() => setConfirmAtt(null)}
        />
      )}
    </>
  );
}
