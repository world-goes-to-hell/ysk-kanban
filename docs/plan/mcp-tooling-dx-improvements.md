# Plan: 일감관리 MCP(jira-test) 도구 DX 개선

**작성일**: 2026-06-17
**대상**: `mcp-server/src/index.js` (MCP 래퍼), 일부 `src/main/java/.../service` (백엔드)
**복잡도**: Medium

## 요약

사용자가 보고한 MCP 사용 불편 6건 + 소소한 2건을 코드로 점검한 결과,
**대부분은 백엔드 기능은 이미 존재하나 MCP 래퍼(395줄)에서 노출/원콜화가 안 된 것**으로 확인됐다.
백엔드는 최소 변경(상태 라벨 매칭만)하고, MCP 래퍼를 중심으로 개선한다.

## 점검 결과 (불편사항 vs 실제 코드)

| # | 불편사항 | 코드 점검 결과 | 처리 |
|---|---------|---------------|------|
| 1 | 하위일감 생성 후 진행중 또 호출(2콜) | `create_subtask`(index.js:84)에 status 옵션 없음. `create_todo`엔 있음(:152). `quick_todo`(:175)는 부모지정 불가 | **유효** → MCP만 수정 |
| 2 | 커스텀 상태키 불투명(CUSTOM_xxx) | `resolveStatus`(ProjectStatusService:147)가 statusKey만 매칭, 라벨("보류") 미지원 → 예외 | **유효** → 백엔드+MCP |
| 3 | 완료 경로 2개로 헷갈림 | `change_todo_status(DONE)` vs `complete_todo` 둘 다 존재, 사용 가이드 없음 | **유효** → 문서/description |
| 4 | 부모-하위 연동 약함 | `autoCompleteParent`(TodoService:191) **이미 구현됨** — 하위 전부 DONE 시 부모 자동완료. 단 ① 진행률 집계는 list_todos가 `[done/total]` 제공(:72) ② 부모 수동완료 시 하위 미완료 경고는 없음 | **부분해결** → 경고만 추가 |
| 5 | 잘못 만든 일감 삭제 불가 | `DELETE /api/todos/{id}`(TodoController:299) **이미 존재**(권한체크 포함). MCP에 delete 도구만 없음 | **유효** → MCP 래퍼 추가 |
| 6 | 목록 조회 빈약 | `list_todos`(index.js:60)는 status 필터만. 백엔드 `/api/todos/report`(:67)는 assigneeId/createdById/status/dateField/page 지원. 트리뷰 없음 | **유효** → MCP 확장 |
| 소1 | complete_todo가 description 덮어쓰는지 | `updateTodo`(:167)가 통째 교체(덮어쓰기). 이력은 댓글에 누적 | 명세 명확화 |
| 소2 | "댓글 #906"이 일감번호와 혼동 | 반환 메시지 포맷 | 메시지 개선 |

**핵심**: 1·3·5·6·소소는 MCP 래퍼(index.js)만으로 해결. 2·4는 백엔드 소폭 수정.

## 변경 파일

| 파일 | 작업 | 이유 |
|------|------|------|
| `mcp-server/src/index.js` | UPDATE | create_subtask status옵션, quick_subtask/delete_todo 추가, list_todos 확장, 메시지/가이드 정비 |
| `src/.../service/ProjectStatusService.java` | UPDATE | resolveStatus에 라벨(name) fallback 매칭 |
| `src/.../repository/ProjectStatusRepository.java` | UPDATE | name으로 active 상태 조회 메서드 추가 |
| `src/.../service/TodoService.java` | UPDATE | (선택) 미완료 하위 존재 여부 헬퍼 |

## 작업 (우선순위 = 사용자 체감순)

### Phase 1 — 하위일감 원콜 (불편 1, 최우선)
- `create_subtask`에 `status` 옵션 추가 → `create_todo`와 동일 패턴(생성 후 status≠TODO면 `/status` PUT)
- 신규 `quick_subtask(parentId, summary, priority?, assigneeName?)` → 생성 + 즉시 IN_PROGRESS 원콜
- **백엔드 무변경** (`POST /subtasks` + `PUT /status` 이미 존재)
- 검증: quick_subtask 1콜로 하위 생성+진행중 확인

### Phase 2 — 트리뷰 / 필터 / 검색 (불편 6, 최우선)
- `list_todos` 파라미터 확장: `priority`, `assignee`(이름), `q`(제목검색), `sort`, `tree`(부모+하위 들여쓰기)
- 데이터 소스 전략: **MCP 클라이언트 필터로 시작**(백엔드 무변경). 정렬·검색·우선순위는 받아온 목록에서 필터링. 기간/담당자 정밀 조회가 필요하면 기존 `/api/todos/report` 활용
- `tree` 옵션: 부모 목록 출력 후 `subtaskTotal>0`인 항목은 `list_subtasks` 결과를 들여쓰기로 펼침
- 검증: `tree:true`로 부모-하위 계층 출력, `q`로 제목 검색, `priority`로 필터 확인

### Phase 3 — 삭제 (불편 5)
- 신규 `delete_todo(todoId, confirm?)` → `DELETE /api/todos/{id}` 호출
- 안전장치: 하위일감이 있으면 개수 경고 후 `confirm:true` 요구 (오삭제 방지)
- 검증: 오타 일감 삭제, 하위 있는 부모 삭제 시 경고 동작 확인

### Phase 4 — 상태 라벨 alias (불편 2)
- `ProjectStatusRepository`: `findByProject_IdAndNameIgnoreCaseAndActiveTrue` 추가
- `resolveStatus`: statusKey 매칭 실패 시 라벨(name)으로 fallback → "보류" 같은 직관적 입력 허용
- MCP `change_todo_status`/`create_todo` description에 "statusKey 또는 라벨 모두 허용" 명시
- 검증: `change_todo_status(id, "보류")` 가 CUSTOM_xxx 키 없이 동작 확인

### Phase 5 — 명세 / 경고 / 메시지 정리 (불편 3·4·소소)
- `complete_todo` description: "change_todo_status=단순 상태이동 / complete_todo=완료+이력기록" 1줄 가이드 + "description은 덮어쓰기, 이력은 댓글 누적" 명시
- `complete_todo`·`change_todo_status(DONE)` 시 미완료 하위일감 있으면 반환 메시지에 경고 추가
- 반환 메시지 정비: `(댓글 #906)` → `(이력 댓글 등록)` 식으로 일감번호와 구분

## 검증

```bash
# MCP 서버 구문/기동
cd mcp-server && node --check src/index.js && npm test 2>/dev/null || echo "no tests"

# 백엔드 컴파일 + 테스트
./gradlew compileJava
./gradlew test
```

## 리스크

| 리스크 | 가능성 | 완화 |
|--------|--------|------|
| list_todos 클라 필터가 대량 데이터에서 느림 | 中 | 1차는 클라 필터, 병목 시 백엔드 report 확장으로 이관 |
| 라벨 fallback이 동일 이름 중복 상태와 충돌 | 低 | name 유니크 가정 확인, 다중매칭 시 첫 active 우선 + 경고 |
| delete cascade로 하위 동반 삭제 | 中 | Phase3 경고/confirm로 사용자 인지, 엔티티 cascade 매핑 사전 확인 |
| 백엔드 변경이 기존 보드 UI 상태변경에 영향 | 低 | resolveStatus는 fallback만 추가(기존 키 경로 불변), 회귀 테스트 |

## 수용 기준
- [x] 하위일감을 1콜로 생성+진행중 전환 가능 (quick_subtask) — `create_subtask`에 status 옵션도 추가
- [x] list_todos가 트리/검색/우선순위/담당자 필터 + 정렬 지원
- [x] delete_todo로 오타·중복 일감 제거 가능(하위 있으면 confirm 경고)
- [x] 상태를 라벨("보류")로도 변경 가능 (resolveStatus 라벨 fallback)
- [x] 완료 도구 사용 가이드(README)와 미완료 하위 경고가 반환 메시지에 노출
- [x] MCP `node --check` 통과, 백엔드 `./gradlew compileJava` BUILD SUCCESSFUL
  - 참고: `src/test`에 테스트 파일 없음(0개) → 회귀 테스트 불가, 변경은 기존 경로 보존하는 보수적 방식

## 구현 결과 (2026-06-17)

| Phase | 변경 | 파일 |
|-------|------|------|
| 1 | create_subtask에 `status` 옵션 + `quick_subtask` 신설 | index.js |
| 2 | list_todos에 priority/assignee/q/sort/tree 추가 (클라 필터) | index.js |
| 3 | `delete_todo` 신설 (하위 있으면 confirm) | index.js |
| 4 | resolveStatus 라벨 fallback + repo 메서드 추가 | ProjectStatusService/Repository.java |
| 5 | complete_todo/change_todo_status 가이드·경고·메시지 정비 | index.js, README.md |

도구 수: 14 → 16 (`quick_subtask`, `delete_todo`)
