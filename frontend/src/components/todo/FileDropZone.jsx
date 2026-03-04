import { useRef } from 'react';
import formStyles from '../../styles/forms.module.css';

export default function FileDropZone({ onFiles }) {
  const inputRef = useRef(null);
  const zoneRef = useRef(null);

  const handleClick = () => inputRef.current?.click();

  const handleDragOver = (e) => {
    e.preventDefault();
    zoneRef.current?.classList.add(formStyles.fileDropZoneDragover);
  };

  const handleDragLeave = () => {
    zoneRef.current?.classList.remove(formStyles.fileDropZoneDragover);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    zoneRef.current?.classList.remove(formStyles.fileDropZoneDragover);
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    if (files.length > 0) onFiles(files);
  };

  const handleChange = () => {
    const files = Array.from(inputRef.current.files);
    if (files.length > 0) onFiles(files);
    inputRef.current.value = '';
  };

  return (
    <div
      ref={zoneRef}
      className={formStyles.fileDropZone}
      onClick={handleClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/*"
        hidden
        onChange={handleChange}
      />
      <p className={formStyles.fileDropText}>이미지를 드래그하거나 클릭하여 업로드</p>
    </div>
  );
}
