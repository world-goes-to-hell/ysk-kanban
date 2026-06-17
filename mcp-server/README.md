# @dksktjdrhks2/kanban-mcp

Claude Code용 칸반 보드 MCP 서버. 일감 등록, 상태 변경, 댓글, 업무보고를 자동화합니다.

## 설치

```bash
npx -y @dksktjdrhks2/kanban-mcp
```

## 환경변수

| 변수 | 필수 | 설명 |
|------|------|------|
| `JIRA_TEST_API_URL` | O | 칸반 서버 URL (예: `https://kanban-5297.origin.mmv.kr`) |
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
        "JIRA_TEST_API_URL": "https://kanban-5297.origin.mmv.kr",
        "JIRA_TEST_API_KEY": "YOUR_API_KEY"
      }
    }
  }
}
```

## 제공 도구

| 도구 | 설명 |
|------|------|
| `list_statuses` | 프로젝트 상태 목록 조회 (커스텀 statusKey 확인) |
| `list_todos` | 일감 목록 조회 (상태·우선순위·담당자 필터 + 제목검색 `q` + 정렬 `sort` + 트리뷰 `tree`) |
| `get_todo` | 일감 상세 조회 |
| `create_todo` | 새 일감 생성 (초기 `status` 지정 가능, statusKey/라벨 허용) |
| `quick_todo` | 일감 생성 + 즉시 진행중 전환 (원콜) |
| `create_subtask` | 하위 일감 생성 (초기 `status` 지정 가능) |
| `quick_subtask` | 하위 일감 생성 + 즉시 진행중 전환 (원콜) |
| `list_subtasks` | 하위 일감 목록 조회 |
| `update_todo` | 일감 수정 |
| `delete_todo` | 일감 삭제 (오타·중복 제거, 하위 있으면 `confirm` 필요) |
| `change_todo_status` | 상태 변경 — 단순 이동. statusKey 또는 라벨("보류" 등) 허용 |
| `complete_todo` | 일감 완료 — DONE + 이력 댓글 기록 한번에. 미완료 하위 있으면 경고 |
| `add_comment` | 댓글 추가 |
| `list_comments` | 댓글 목록 조회 |
| `get_work_history` | 기간별 작업이력 조회 (상태별) |
| `generate_daily_report` | 일일 업무보고 생성 |

### 완료 처리: `change_todo_status` vs `complete_todo`

- **단순 상태 이동** (예: TODO → IN_PROGRESS, 보류 등) → `change_todo_status`
- **완료 + 작업이력 기록** → `complete_todo` (DONE 전환 + 이력 댓글 누적)
- `description`은 **덮어쓰기**(누적 아님), 진행 이력은 **댓글에 누적**됩니다.
- 하위 일감이 모두 DONE이 되면 **상위 일감은 자동 완료**됩니다.

## 라이선스

MIT
