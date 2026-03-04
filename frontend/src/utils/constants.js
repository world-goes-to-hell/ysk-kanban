export const STATUS_TRANSITIONS = {
  TODO:        [{ status: 'IN_PROGRESS', label: '진행 중' }, { status: 'DONE', label: '완료' }],
  IN_PROGRESS: [{ status: 'TODO', label: '할 일' }, { status: 'DONE', label: '완료' }],
  DONE:        [{ status: 'TODO', label: '할 일' }, { status: 'IN_PROGRESS', label: '진행 중' }],
};

export const PRIORITY_CLASS = {
  HIGHEST: 'priority--highest',
  HIGH:    'priority--high',
  MEDIUM:  'priority--medium',
  LOW:     'priority--low',
  LOWEST:  'priority--lowest',
};

export const PRIORITY_LABEL = {
  HIGHEST: '최상',
  HIGH:    '높음',
  MEDIUM:  '보통',
  LOW:     '낮음',
  LOWEST:  '최하',
};

export const STATUS_LABEL = {
  TODO:        '할 일',
  IN_PROGRESS: '진행 중',
  DONE:        '완료',
};

export const PRIORITY_COLORS = {
  HIGHEST: 'var(--p-highest)',
  HIGH:    'var(--p-high)',
  MEDIUM:  'var(--p-medium)',
  LOW:     'var(--p-low)',
  LOWEST:  'var(--p-lowest)',
};

export const COLUMN_STATUS_MAP = {
  TODO:        'TODO',
  IN_PROGRESS: 'IN_PROGRESS',
  DONE:        'DONE',
};

export const STATUSES = ['TODO', 'IN_PROGRESS', 'DONE'];
