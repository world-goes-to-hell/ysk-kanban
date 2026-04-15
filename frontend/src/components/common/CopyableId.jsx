import { useState, useCallback } from 'react';

export default function CopyableId({ id, className }) {
  const [copied, setCopied] = useState(false);

  const handleClick = useCallback((e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(String(id)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    });
  }, [id]);

  return (
    <span
      className={className}
      onClick={handleClick}
      style={{ cursor: 'pointer' }}
      title="클릭하여 복사"
    >
      {copied ? '복사됨!' : `#${id}`}
    </span>
  );
}
