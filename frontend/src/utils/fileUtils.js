const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'];

const FILE_ICONS = {
  pdf: '\uD83D\uDCC4',
  doc: '\uD83D\uDCC3', docx: '\uD83D\uDCC3',
  xls: '\uD83D\uDCCA', xlsx: '\uD83D\uDCCA',
  ppt: '\uD83D\uDCCA', pptx: '\uD83D\uDCCA',
  hwp: '\uD83D\uDCC3', hwpx: '\uD83D\uDCC3',
  zip: '\uD83D\uDCE6', rar: '\uD83D\uDCE6', '7z': '\uD83D\uDCE6',
  txt: '\uD83D\uDCC4', csv: '\uD83D\uDCC4',
};

function getExt(filename) {
  return (filename || '').split('.').pop().toLowerCase();
}

export function isImageType(att) {
  if (att.contentType?.startsWith('image/')) return true;
  return IMAGE_EXTS.includes(getExt(att.originalFilename));
}

export function getFileIcon(filename) {
  return FILE_ICONS[getExt(filename)] || '\uD83D\uDCCE';
}
