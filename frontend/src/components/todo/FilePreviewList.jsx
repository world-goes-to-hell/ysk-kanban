import { useMemo } from 'react';
import formStyles from '../../styles/forms.module.css';

export default function FilePreviewList({ files, onRemove }) {
  const previews = useMemo(() =>
    files.map((file, idx) => ({
      url: URL.createObjectURL(file),
      name: file.name,
      idx,
    })),
    [files]
  );

  if (files.length === 0) return null;

  return (
    <div className={formStyles.filePreviewList}>
      {previews.map(p => (
        <div key={p.idx} className={formStyles.filePreviewItem}>
          <img src={p.url} alt={p.name} />
          <button
            type="button"
            className={formStyles.filePreviewRemove}
            onClick={() => onRemove(p.idx)}
          >
            &times;
          </button>
        </div>
      ))}
    </div>
  );
}
