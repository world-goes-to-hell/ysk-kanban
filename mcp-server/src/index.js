#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const API_BASE = process.env.JIRA_TEST_API_URL || 'https://kanban-5297.origin.mmv.kr';
const API_KEY = process.env.JIRA_TEST_API_KEY;

if (!API_KEY) {
  console.error('JIRA_TEST_API_KEY 환경변수가 설정되지 않았습니다.');
  process.exit(1);
}

async function apiFetch(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
      ...options.headers,
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`API ${res.status}: ${body}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

const PRIORITY_ORDER = { HIGHEST: 0, HIGH: 1, MEDIUM: 2, LOW: 3, LOWEST: 4 };

function formatTodoLine(t) {
  const subtaskInfo = t.subtaskTotal > 0 ? ` [${t.subtaskDone}/${t.subtaskTotal}]` : '';
  return `#${t.id} [${t.statusKey || t.status}] ${t.priority || ''} ${t.summary}${subtaskInfo}`;
}

function sortTodos(todos, sort) {
  const arr = [...todos];
  switch (sort) {
    case 'id': return arr.sort((a, b) => a.id - b.id);
    case '-id': return arr.sort((a, b) => b.id - a.id);
    case 'priority': return arr.sort((a, b) =>
      (PRIORITY_ORDER[a.priority] ?? 99) - (PRIORITY_ORDER[b.priority] ?? 99));
    case 'status': return arr.sort((a, b) =>
      (a.statusKey || a.status || '').localeCompare(b.statusKey || b.status || ''));
    default: return arr;
  }
}

// 미완료 하위 일감 개수 (완료 전 경고용). 조회 실패 시 null
async function countOpenSubtasks(todoId) {
  try {
    const subs = await apiFetch(`/api/todos/${todoId}/subtasks`);
    return subs.filter(s => (s.statusKey || s.status) !== 'DONE'
      && s.status !== 'DONE').length;
  } catch (_) {
    return null;
  }
}

const server = new McpServer({
  name: 'jira-test',
  version: '1.0.0',
});

// ─── Tools ───

server.tool(
  'list_statuses',
  '프로젝트에서 사용할 수 있는 상태 목록 조회',
  {
    projectId: z.number().optional().describe('프로젝트 ID (API Key에 바인딩된 경우 생략 가능)'),
  },
  async ({ projectId }) => {
    const path = projectId ? `/api/statuses?projectId=${projectId}` : '/api/statuses';
    const data = await apiFetch(path);
    const summary = data.map(s =>
      `${s.position}. ${s.name} (${s.statusKey}, ${s.semanticStatus}, ${s.color || 'no-color'}${s.systemStatus ? ', 기본' : ''})`
    ).join('\n');
    return {
      content: [{
        type: 'text',
        text: summary || '등록된 상태가 없습니다.',
      }],
    };
  }
);

server.tool(
  'list_todos',
  '이 프로젝트의 일감 목록 조회 (상태/우선순위/담당자 필터 + 제목검색 + 정렬 + 트리뷰)',
  {
    status: z.string().optional().describe('상태 필터. 기본 상태(TODO/IN_PROGRESS/DONE) 또는 list_statuses의 statusKey/라벨'),
    priority: z.enum(['HIGHEST', 'HIGH', 'MEDIUM', 'LOW', 'LOWEST']).optional().describe('우선순위 필터'),
    assignee: z.string().optional().describe('담당자 이름/표시명 부분일치 필터'),
    q: z.string().optional().describe('제목 검색어 (부분일치, 대소문자 무시)'),
    sort: z.enum(['id', '-id', 'priority', 'status']).optional().describe('정렬 기준 (기본: 보드 순서)'),
    tree: z.boolean().optional().describe('true면 부모-하위 일감을 들여쓰기 트리로 표시'),
  },
  async ({ status, priority, assignee, q, sort, tree }) => {
    // projectId는 API Key에 바인딩되어 서버가 자동 결정
    let path = '/api/todos';
    if (status) path += `?status=${encodeURIComponent(status)}`;
    let data = await apiFetch(path);

    // ── 클라이언트 필터 (백엔드 무변경) ──
    if (priority) data = data.filter(t => t.priority === priority);
    if (q) {
      const needle = q.toLowerCase();
      data = data.filter(t => (t.summary || '').toLowerCase().includes(needle));
    }
    if (assignee) {
      const needle = assignee.toLowerCase();
      data = data.filter(t => (t.assignees || []).some(a =>
        (a.displayName || a.username || '').toLowerCase().includes(needle)));
    }
    if (sort) data = sortTodos(data, sort);

    if (data.length === 0) {
      return { content: [{ type: 'text', text: '조건에 맞는 일감이 없습니다.' }] };
    }

    // ── 트리 뷰: 부모 아래 하위 일감을 들여쓰기로 펼침 ──
    if (tree) {
      const lines = [];
      for (const t of data) {
        lines.push(formatTodoLine(t));
        if (t.subtaskTotal > 0) {
          const subs = await apiFetch(`/api/todos/${t.id}/subtasks`);
          for (const s of subs) lines.push('   └ ' + formatTodoLine(s));
        }
      }
      return { content: [{ type: 'text', text: lines.join('\n') }] };
    }

    const summary = data.map(formatTodoLine).join('\n');
    return { content: [{ type: 'text', text: summary }] };
  }
);

server.tool(
  'create_subtask',
  '상위 일감의 하위 일감 생성 (초기 상태 지정 가능)',
  {
    parentId: z.number().describe('상위 일감 ID'),
    summary: z.string().describe('하위 일감 제목'),
    description: z.string().optional().describe('하위 일감 설명'),
    priority: z.enum(['HIGHEST', 'HIGH', 'MEDIUM', 'LOW', 'LOWEST']).optional().describe('우선순위'),
    assigneeName: z.string().optional().describe('담당 에이전트 이름'),
    status: z.string().optional().describe('초기 상태 key/라벨. 생략 시 TODO (진행중부터 시작하려면 quick_subtask 권장)'),
  },
  async ({ parentId, status, ...fields }) => {
    const data = await apiFetch(`/api/todos/${parentId}/subtasks`, {
      method: 'POST',
      body: JSON.stringify(fields),
    });
    if (status && status !== 'TODO') {
      await apiFetch(`/api/todos/${data.id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      });
    }
    return {
      content: [{
        type: 'text',
        text: `하위 일감 #${data.id} 생성됨 (상위 #${parentId})${status && status !== 'TODO' ? ` → ${status}` : ''}: ${data.summary}`,
      }],
    };
  }
);

server.tool(
  'quick_subtask',
  '하위 일감 생성 + 즉시 진행중 상태 전환 (원콜). Phase별 작업 시작에 사용',
  {
    parentId: z.number().describe('상위 일감 ID'),
    summary: z.string().describe('하위 일감 제목'),
    description: z.string().optional().describe('하위 일감 설명'),
    priority: z.enum(['HIGHEST', 'HIGH', 'MEDIUM', 'LOW', 'LOWEST']).optional().describe('우선순위'),
    assigneeName: z.string().optional().describe('담당 에이전트 이름'),
  },
  async ({ parentId, ...fields }) => {
    const data = await apiFetch(`/api/todos/${parentId}/subtasks`, {
      method: 'POST',
      body: JSON.stringify(fields),
    });
    await apiFetch(`/api/todos/${data.id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status: 'IN_PROGRESS' }),
    });
    return {
      content: [{
        type: 'text',
        text: `하위 일감 #${data.id} 생성 → IN_PROGRESS (상위 #${parentId}): ${data.summary}\n\n완료 시: complete_todo(todoId: ${data.id}, comment: "한줄요약")`,
      }],
    };
  }
);

server.tool(
  'list_subtasks',
  '상위 일감의 하위 일감 목록 조회',
  {
    parentId: z.number().describe('상위 일감 ID'),
  },
  async ({ parentId }) => {
    const data = await apiFetch(`/api/todos/${parentId}/subtasks`);
    const summary = data.map(t =>
      `  #${t.id} [${t.statusKey || t.status}] ${t.priority || ''} ${t.summary}`
    ).join('\n');
    return {
      content: [{
        type: 'text',
        text: summary || '하위 일감이 없습니다.',
      }],
    };
  }
);

server.tool(
  'get_todo',
  '일감 상세 정보 조회',
  {
    todoId: z.number().describe('일감 ID'),
  },
  async ({ todoId }) => {
    const data = await apiFetch(`/api/todos/${todoId}`);
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(data, null, 2),
      }],
    };
  }
);

server.tool(
  'create_todo',
  '새 일감 생성 (프로젝트는 API Key에 바인딩됨)',
  {
    summary: z.string().describe('일감 제목'),
    description: z.string().optional().describe('일감 설명'),
    priority: z.enum(['HIGHEST', 'HIGH', 'MEDIUM', 'LOW', 'LOWEST']).optional().describe('우선순위'),
    status: z.string().optional().describe('초기 상태 key/라벨. statusKey 또는 라벨("보류" 등) 허용'),
  },
  async ({ status, ...args }) => {
    // projectId는 서버에서 API Key 기반으로 자동 주입
    const data = await apiFetch('/api/todos', {
      method: 'POST',
      body: JSON.stringify(args),
    });
    if (status && status !== 'TODO') {
      await apiFetch(`/api/todos/${data.id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      });
    }
    return {
      content: [{
        type: 'text',
        text: `일감 #${data.id} 생성됨${status ? ` → ${status}` : ''}: ${data.summary}`,
      }],
    };
  }
);

server.tool(
  'quick_todo',
  '일감 생성 + 즉시 진행중 상태 전환 (원콜)',
  {
    summary: z.string().describe('일감 제목'),
    description: z.string().optional().describe('일감 설명'),
    priority: z.enum(['HIGHEST', 'HIGH', 'MEDIUM', 'LOW', 'LOWEST']).optional().describe('우선순위'),
  },
  async (args) => {
    const data = await apiFetch('/api/todos', {
      method: 'POST',
      body: JSON.stringify(args),
    });
    await apiFetch(`/api/todos/${data.id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status: 'IN_PROGRESS' }),
    });
    return {
      content: [{
        type: 'text',
        text: `일감 #${data.id} 생성 → IN_PROGRESS: ${data.summary}\n\n완료 시: complete_todo(todoId: ${data.id}, comment: "한줄요약", description: "상세 내역")`,
      }],
    };
  }
);

server.tool(
  'update_todo',
  '일감 수정',
  {
    todoId: z.number().describe('일감 ID'),
    summary: z.string().optional().describe('제목'),
    description: z.string().optional().describe('설명'),
    priority: z.enum(['HIGHEST', 'HIGH', 'MEDIUM', 'LOW', 'LOWEST']).optional().describe('우선순위'),
  },
  async ({ todoId, ...fields }) => {
    await apiFetch(`/api/todos/${todoId}`, {
      method: 'PUT',
      body: JSON.stringify(fields),
    });
    return {
      content: [{
        type: 'text',
        text: `일감 #${todoId} 수정됨`,
      }],
    };
  }
);

server.tool(
  'delete_todo',
  '일감 삭제 (오타·중복 제거). 하위 일감이 있으면 confirm 필요',
  {
    todoId: z.number().describe('삭제할 일감 ID'),
    confirm: z.boolean().optional().describe('하위 일감이 있어도 함께 삭제하려면 true'),
  },
  async ({ todoId, confirm }) => {
    const open = await countOpenSubtasks(todoId);
    const subs = await apiFetch(`/api/todos/${todoId}/subtasks`).catch(() => []);
    if (subs.length > 0 && !confirm) {
      return {
        content: [{
          type: 'text',
          text: `⚠️ 일감 #${todoId}에 하위 일감 ${subs.length}개(미완료 ${open ?? '?'})가 있습니다. ` +
                `함께 삭제하려면 delete_todo(todoId: ${todoId}, confirm: true)`,
        }],
      };
    }
    await apiFetch(`/api/todos/${todoId}`, { method: 'DELETE' });
    return {
      content: [{
        type: 'text',
        text: `일감 #${todoId} 삭제됨${subs.length > 0 ? ` (하위 ${subs.length}개 포함)` : ''}`,
      }],
    };
  }
);

server.tool(
  'change_todo_status',
  '일감 상태 변경(단순 이동). 완료+이력 기록이 필요하면 complete_todo 사용',
  {
    todoId: z.number().describe('일감 ID'),
    status: z.string().describe('변경할 상태. statusKey 또는 라벨("보류" 등) 모두 허용'),
  },
  async ({ todoId, status }) => {
    const isDone = status === 'DONE';
    const open = isDone ? await countOpenSubtasks(todoId) : null;
    await apiFetch(`/api/todos/${todoId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
    const warn = open ? `\n⚠️ 미완료 하위 일감 ${open}개가 남아있습니다.` : '';
    return {
      content: [{
        type: 'text',
        text: `일감 #${todoId} 상태 → ${status}${warn}`,
      }],
    };
  }
);

server.tool(
  'complete_todo',
  '일감 완료(DONE) + 작업이력 댓글 기록을 한번에. ' +
  '단순 상태 이동만 필요하면 change_todo_status 사용. ' +
  'description은 덮어쓰기(누적 아님)되고, 진행 이력은 댓글에 누적됨',
  {
    todoId: z.number().describe('일감 ID'),
    comment: z.string().describe('작업 한줄요약 (이력 댓글로 누적 기록)'),
    description: z.string().optional().describe('상세 작업 내역. 기존 description을 덮어씀(누적 아님)'),
  },
  async ({ todoId, comment, description }) => {
    const open = await countOpenSubtasks(todoId);
    if (description) {
      await apiFetch(`/api/todos/${todoId}`, {
        method: 'PUT',
        body: JSON.stringify({ description }),
      });
    }
    await apiFetch(`/api/todos/${todoId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status: 'DONE' }),
    });
    await apiFetch(`/api/todos/${todoId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content: comment }),
    });
    const warn = open ? `\n⚠️ 미완료 하위 일감 ${open}개가 남아있습니다.` : '';
    return {
      content: [{
        type: 'text',
        text: `일감 #${todoId} 완료 + 이력 댓글 기록: ${comment}${warn}`,
      }],
    };
  }
);

server.tool(
  'add_comment',
  '일감에 댓글(작업 내역) 추가',
  {
    todoId: z.number().describe('일감 ID'),
    content: z.string().describe('댓글 내용'),
  },
  async ({ todoId, content }) => {
    const data = await apiFetch(`/api/todos/${todoId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
    return {
      content: [{
        type: 'text',
        text: `댓글 #${data.id} 등록됨 (일감 #${todoId})`,
      }],
    };
  }
);

server.tool(
  'list_comments',
  '일감의 댓글(작업 이력) 목록 조회',
  {
    todoId: z.number().describe('일감 ID'),
  },
  async ({ todoId }) => {
    const data = await apiFetch(`/api/todos/${todoId}/comments`);
    const summary = data.map(c =>
      `#${c.id} [${c.author?.displayName || ''}] ${c.content?.substring(0, 100) || ''}`
    ).join('\n');
    return {
      content: [{
        type: 'text',
        text: summary || '댓글이 없습니다.',
      }],
    };
  }
);

server.tool(
  'get_work_history',
  '특정 기간의 작업이력을 상태별(할일/진행중/완료)로 조회',
  {
    startDate: z.string().describe('시작일 (YYYY-MM-DD)'),
    endDate: z.string().optional().describe('종료일 (YYYY-MM-DD, 기본: startDate와 동일)'),
  },
  async ({ startDate, endDate }) => {
    const end = endDate || startDate;
    const statuses = ['TODO', 'IN_PROGRESS', 'DONE'];
    const labels = { TODO: '할일', IN_PROGRESS: '진행중', DONE: '완료' };
    const lines = [];

    for (const status of statuses) {
      const data = await apiFetch(
        `/api/todos/report?startDate=${startDate}&endDate=${end}&status=${status}&dateField=updatedAt&size=100`
      );
      const todos = data.content || [];
      lines.push(`[${labels[status]}] (${todos.length}건)`);
      if (todos.length === 0) {
        lines.push('  - 없음');
      } else {
        for (const t of todos) {
          const assignees = (t.assignees || []).map(a => a.displayName || a.username).join(', ');
          const assigneeStr = assignees ? ` (@${assignees})` : '';
          lines.push(`  - #${t.id} ${t.summary}${assigneeStr}`);
          if (t.description) {
            const desc = t.description.length > 200 ? t.description.substring(0, 200) + '...' : t.description;
            lines.push(`    내용: ${desc}`);
          }
          // 하위 일감이 있으면 표시
          if (t.subtaskTotal != null && t.subtaskTotal > 0) {
            lines.push(`    하위일감: ${t.subtaskDone || 0}/${t.subtaskTotal} 완료`);
          }
          // 최신 댓글 조회
          try {
            const comments = await apiFetch(`/api/todos/${t.id}/comments`);
            if (comments && comments.length > 0) {
              const latest = comments[comments.length - 1];
              const content = latest.content?.length > 100 ? latest.content.substring(0, 100) + '...' : latest.content;
              lines.push(`    최근댓글: ${content}`);
            }
          } catch (_) {}
        }
      }
      lines.push('');
    }

    return {
      content: [{
        type: 'text',
        text: `작업이력 (${startDate} ~ ${end})\n\n${lines.join('\n')}`,
      }],
    };
  }
);

server.tool(
  'generate_daily_report',
  '금일 업무보고 텍스트 생성',
  {
    date: z.string().optional().describe('날짜 (YYYY-MM-DD, 기본: 오늘)'),
  },
  async ({ date }) => {
    const path = date ? `/api/reports/daily?date=${date}` : '/api/reports/daily';
    const data = await apiFetch(path);
    return {
      content: [{
        type: 'text',
        text: data.report,
      }],
    };
  }
);

// ─── Start ───
const transport = new StdioServerTransport();
await server.connect(transport);
