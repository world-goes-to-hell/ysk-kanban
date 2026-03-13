#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const API_BASE = process.env.JIRA_TEST_API_URL || 'http://localhost:8080';
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

const server = new McpServer({
  name: 'jira-test',
  version: '1.0.0',
});

// ─── Tools ───

server.tool(
  'list_todos',
  '이 프로젝트의 일감 목록 조회 (상태 필터 가능)',
  {
    status: z.enum(['TODO', 'IN_PROGRESS', 'DONE']).optional().describe('상태 필터 (생략 시 전체)'),
  },
  async ({ status }) => {
    // projectId는 API Key에 바인딩되어 서버가 자동 결정
    let path = '/api/todos';
    if (status) path += `?status=${status}`;
    const data = await apiFetch(path);
    const summary = data.map(t =>
      `#${t.id} [${t.status}] ${t.priority || ''} ${t.summary}`
    ).join('\n');
    return {
      content: [{
        type: 'text',
        text: summary || '일감이 없습니다.',
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
  },
  async (args) => {
    // projectId는 서버에서 API Key 기반으로 자동 주입
    const data = await apiFetch('/api/todos', {
      method: 'POST',
      body: JSON.stringify(args),
    });
    return {
      content: [{
        type: 'text',
        text: `일감 #${data.id} 생성됨: ${data.summary}`,
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
    const current = await apiFetch(`/api/todos/${todoId}`);
    const merged = {
      summary: fields.summary ?? current.summary,
      description: fields.description ?? current.description ?? '',
      priority: fields.priority ?? current.priority,
    };
    await apiFetch(`/api/todos/${todoId}`, {
      method: 'PUT',
      body: JSON.stringify(merged),
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
  'change_todo_status',
  '일감 상태 변경 (TODO, IN_PROGRESS, DONE)',
  {
    todoId: z.number().describe('일감 ID'),
    status: z.enum(['TODO', 'IN_PROGRESS', 'DONE']).describe('변경할 상태'),
  },
  async ({ todoId, status }) => {
    await apiFetch(`/api/todos/${todoId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
    return {
      content: [{
        type: 'text',
        text: `일감 #${todoId} 상태 → ${status}`,
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
