# @dksktjdrhks2/kanban-mcp

Claude Code용 칸반 보드 MCP 서버. 일감 등록, 상태 변경, 댓글, 업무보고를 자동화합니다.

## 설치

```bash
npx -y @dksktjdrhks2/kanban-mcp
```

## 환경변수

| 변수 | 필수 | 설명 |
|------|------|------|
| `JIRA_TEST_API_URL` | O | 칸반 서버 URL (예: `https://kanban.junu.me`) |
| `JIRA_TEST_API_KEY` | O | 프로젝트 API Key |

## Claude Code에서 사용하기

프로젝트 루트에 `.mcp.json` 파일을 생성합니다:

```json
{
  "mcpServers": {
    "jira-test": {
      "command": "npx",
      "args": ["-y", "@dksktjdrhks2/kanban-mcp"],
      "env": {
        "JIRA_TEST_API_URL": "https://kanban.junu.me",
        "JIRA_TEST_API_KEY": "YOUR_API_KEY"
      }
    }
  }
}
```

## 제공 도구

| 도구 | 설명 |
|------|------|
| `list_todos` | 일감 목록 조회 (상태 필터 가능) |
| `get_todo` | 일감 상세 조회 |
| `create_todo` | 새 일감 생성 |
| `quick_todo` | 일감 생성 + 즉시 진행중 전환 (완료 시 사용할 ID 안내) |
| `complete_todo` | 일감 완료 (description + DONE + 댓글 한번에) |
| `update_todo` | 일감 수정 |
| `change_todo_status` | 상태 변경 (TODO/IN_PROGRESS/DONE) |
| `add_comment` | 댓글 추가 |
| `list_comments` | 댓글 목록 조회 |
| `generate_daily_report` | 일일 업무보고 생성 |

## 라이선스

MIT
