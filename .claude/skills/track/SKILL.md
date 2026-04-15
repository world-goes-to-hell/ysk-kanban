---
description: 코드 수정 시 일감 추적을 자동화하는 스킬. jira-test MCP를 통해 일감 등록, 하위 일감 생성, 상태 변경, 완료 처리, 작업이력 조회, 업무보고를 수행한다. 코드를 수정(Edit/Write)하기 전에 반드시 이 스킬로 일감을 먼저 등록해야 한다. 하위 일감은 Windows 환경에서 tmux 기반 에이전트 팀 모니터링이 불가한 점을 보완하기 위한 기능으로, 에이전트 팀 작업 시 각 서브에이전트가 자신의 작업을 하위 일감으로 등록(assigneeName=에이전트이름)하면 bot 담당자가 자동 생성되어 리더와 사용자가 일감 보드에서 팀의 실시간 진행 상황을 확인할 수 있다. /track, 일감 관리, 작업 추적, 하위 일감, 에이전트 팀, 작업이력, 업무보고 요청 시 이 스킬을 사용할 것.
---
# 작업 추적 스킬 (jira-test MCP)

## 언제 사용

코드 수정(Edit/Write)이 수반되는 모든 작업에서 의무. 질문/조회/설명만 하는 요청은 예외. 수정 전에 일감을 먼저 등록해두지 않으면 "누가 뭘 왜 바꿨는지" 추적이 끊긴다.

판단 예시:
- "이 버그 수정해줘" / "이 기능 추가해줘" / "리팩토링 해줘" → 이 스킬 사용
- "이 코드 설명해줘" / "왜 이렇게 동작해?" → 불필요

## 도구 매핑

사용자가 `/track <의도> ...` 형태로 호출하면 리더가 아래 MCP 도구로 매핑한다. `/track`은 슬래시 커맨드가 아니라 이 스킬의 내부 의도 분기 — 실제 실행은 MCP. 사용자 의도가 명시적(`/track start`)이든 암묵적("이거 수정해줘")이든 동일하게 매핑.

| 의도 | MCP 도구 | 효과 |
|------|----------|------|
| 새 작업 시작 | `quick_todo(summary, description, priority)` | 일감 생성 + 즉시 IN_PROGRESS (원콜) |
| 하위 작업 생성 | `create_subtask(parentId, summary, assigneeName, ...)` | 하위 일감 + 담당자(bot) 자동 설정 |
| 상태 전환 | `change_todo_status(todoId, status)` | TODO/IN_PROGRESS/DONE |
| 이정표 기록 | `add_comment(todoId, content)` | 댓글 1줄 — 보드에 실시간 노출 |
| 상세 누적 | `update_todo(todoId, description)` | description append (덮어쓰기 금지) |
| 작업 완료 | `complete_todo(todoId, comment, description)` | description 업데이트 + DONE + 댓글을 원콜로 |
| 일감 목록 | `list_todos(status?)` | 필요 시 상태 필터 |
| 일감 상세 | `get_todo(todoId)` | 기존 작업 맥락 파악 |
| 댓글 목록 | `list_comments(todoId)` | 기존 작업 맥락 파악 |
| 작업 이력 | `get_work_history(startDate, endDate?)` | 날짜별 상태 그룹 + description + 댓글 |
| 업무보고 | `generate_daily_report(date?)` | 일일 보고 생성 |

기존 일감이 주어지면 **새로 만들지 않는다** — `get_todo`로 맥락 파악 후 그 일감 안에서 이어간다. DONE 상태면 `change_todo_status(IN_PROGRESS)`로 재오픈.

텍스트 파라미터에 `\n` 문자열 금지. 실제 줄바꿈(멀티라인) 사용.

## 워크플로우

### 단독 작업

```
1. quick_todo 호출 → ID 기억
2. 코드 수정 (Edit/Write)
3. complete_todo(todoId, comment="한줄요약", description="상세")
```

### 에이전트 팀 작업 (Windows 가시성 패턴)

Windows에서 tmux 기반 팀 모니터링을 쓸 수 없다. 대신 하위 일감 + 담당자(bot) + 실시간 댓글로 보드가 **실시간 모니터**가 된다. 사용자는 일감 상세에서 각 서브에이전트의 진행을 그대로 본다.

```
1. 리더: quick_todo로 상위 일감 생성 → parentId 확보 + 사용자에게 공유
2. 각 서브에이전트 디스패치 시 prompt에 parentId + 본인 에이전트 이름 포함
3. 서브에이전트: create_subtask(parentId, summary, assigneeName=자기이름)
                 → 즉시 change_todo_status(subtaskId, IN_PROGRESS)
4. 서브에이전트: 주요 단계 전환마다 add_comment (한 줄 이정표)
5. 서브에이전트: complete_todo(subtaskId, comment, description)
6. 리더: 모든 하위 완료 후 complete_todo(parentId, 전체 한줄요약, 통합 description)
```

## 서브에이전트 프로토콜 (에이전트 팀 필수)

하위 일감을 배정받은 서브에이전트는 **자기 손으로** 상태 전환과 이정표 댓글을 남긴다. 왜? 리더가 대신하면 사용자는 결과 도착 전까지 "지금 작업 중인지"조차 못 본다 — 하위 일감 기능의 존재 이유(가시성)가 무너진다.

### 전제

- 서브에이전트는 **MCP 도구 접근 가능한 타입**으로 디스패치 (`general-purpose` 등). `Explore`는 read-only라 불가 → 아래 fallback 사용.
- 리더는 디스패치 프롬프트에 반드시 포함:
  - 본인 에이전트 이름 (예: `"backend-analyzer"`)
  - 담당할 하위 일감 ID (예: `subtaskId=442`)
  - 3단계 절차 안내

### 3단계 의무

| 시점 | 호출 | 이유 |
|------|------|------|
| **시작** | `change_todo_status(subtaskId, IN_PROGRESS)` | 사용자가 보드에서 "작업 중" 즉시 인지 |
| **중간** | `add_comment(subtaskId, "한 줄")` | 사용자가 "지금 뭐 하는지" 실시간 확인 |
| **완료** | `complete_todo(subtaskId, comment, description)` | 상위 진행률로 팀 전체 진도 드러남 |

### 이정표 댓글 가이드

한국어, 한 줄, 20자 내외. 장문 금지. 다음 시점마다 최소 한 번:

| 시점 | 예시 문구 |
|------|-----------|
| 범위 파악 완료 | "backend/src 파일 구조 확인" |
| 주요 단계 전환 | "엔티티 완료, 컨트롤러 분석" |
| 핵심 발견 | "N+1 후보 3건 식별" |
| 위험 발견 | "H2 콘솔 원격 노출 확인" |
| 장애 조우 | "파일 접근 오류, 우회 조사" |

디테일한 원인/파일/변경은 `update_todo(description)` append 또는 `complete_todo`의 description 파라미터로. 댓글은 요약만.

### Explore fallback (예외 패턴, 필수)

**상황**: Explore 등 read-only 서브에이전트를 쓸 수밖에 없는 경우(분석 전용, 토큰 절약). 서브에이전트가 자율 호출 못 하므로 리더가 **대신 흘려서 가시성을 시뮬레이션**한다. 본 패턴은 fallback이지 정상 경로 아님.

리더가 채워야 할 4지점:
1. 디스패치 **전**: `change_todo_status(subtaskId, IN_PROGRESS)`
2. 디스패치 **직전**: `add_comment(subtaskId, "[{agentName}] 분석 시작 - {범위}")`
3. 결과 도착 **직후**: `add_comment(subtaskId, "[{agentName}] 분석 완료 - N건 발견, 정리 중")`
4. 마무리: `complete_todo(subtaskId, comment, description)`

**봇 author 한계**: 현재 `add_comment`는 호출자 User로 author가 찍힌다 → 리더 호출 시 운영자 명의. 댓글 본문 `[{agentName}]` 프리픽스로 식별해 가시성을 보완.

**절대 금지**:
- 흘림 댓글에 가짜 내용 작성 ("엔티티 5개 확인" 인데 실제 모름) → 사실 위반. 흘림은 **단계 신호만**, 내용 없음.
- 흘림 한 번도 없이 결과만 description에 한 방에 적재 → fallback의 목적 소실.

**장기 개선**: `general-purpose` + ToolSearch로 MCP 자율 로드 → fallback 불필요. 검증 후 표준 채택.

## Description 마크다운 형식 (필수)

일감 상세(`DetailInfo.jsx`)는 description을 `react-markdown` + `remarkGfm`으로 렌더링한다. **평문 줄글 금지**.

### 표준 섹션

작업 종류에 따라 조합. 모든 섹션이 매번 필요하진 않지만 순서는 유지.

```markdown
## 배경
무엇/왜 (1-3줄)

## 원인 (버그/이슈일 때)
근본 원인 + 발견 경위

## 변경
| 파일 | 변경 |
|------|------|
| `path/file.java:120` | XX 추가 |

## 동작/효과
- 사용자/시스템 입장 변화

## 검증
- [x] 컴파일 통과
- [ ] 운영 재배포 후 확인

## 후속/리스크
- 남은 작업, 한계
```

### 요소 규칙

| 요소 | 사용처 |
|------|--------|
| `## 헤딩` / `### 하위` | 섹션 구분 |
| 테이블 | 변경 파일, 비교, 옵션 |
| 인라인 코드 `` `path:line` `` | 파일 경로, 함수명, 변수, 명령 |
| 코드 블록 ` ``` ` | 다중 줄 코드/설정 |
| 체크리스트 `- [ ]` / `- [x]` | 검증, TODO |
| 강조 `**중요**` | 핵심 키워드 |
| 인용 `>` | 외부 보고/스펙 발췌 |

### 원칙

1. **결론 먼저** — 첫 섹션은 `## 배경` 또는 `## 원인`. 한 줄로 변경 요지 전달
2. **파일 경로는 인라인 코드** (`path:line`) — IDE 점프 가능
3. **여러 변경은 표로** — 줄글보다 빠르게 읽힘
4. **줄글 3줄 초과 금지** — 불릿/표로 분해
5. **검증 체크리스트에 거짓 표시 금지** — 실제 실행한 것만 `[x]`. `gradle compileJava` 안 돌렸는데 `[x]`로 적으면 신뢰 붕괴

## 댓글 vs description 역할 분리

업무보고는 댓글로 모인다. 따라서:

| 항목 | 어디에 | 예시 |
|------|--------|------|
| 한 줄 요약 (업무보고 노출) | **comment** | "인증 기능 구현 완료 (BE 3, FE 2)" |
| 원인 분석 | description | "원인: collectProjectIds 재귀 미적용" |
| 수정 파일 목록 | description | "수정: TodoService.java, ReportPage.jsx" |
| 디테일 변경 내용 | description | "projectId 조건을 IN 절로 변경" |

comment에 장문 금지, description 비우기 금지. 절대 반대로 하지 말 것.

## 우선순위 가이드

| 상황 | priority |
|------|----------|
| 긴급 버그/장애 | HIGHEST |
| 중요 기능 구현 | HIGH |
| 일반 기능/개선 | MEDIUM |
| 리팩토링/정리 | LOW |
| 문서/코멘트 | LOWEST |

## 금지사항 (통합)

- 코드 수정 전 일감 생성 없이 작업 시작
- MCP 직접 호출 (반드시 이 스킬 경유)
- comment에 장문 작성
- description 비워두기
- description을 평문 줄글로 작성 (마크다운 형식 의무)
- 검증 체크리스트에 실행 안 한 항목 `[x]` 표시
- 서브에이전트가 상태 전환 생략하고 조용히 작업
- 리더가 서브에이전트 대신 상태/댓글 관리 (Explore fallback만 예외)
- Explore fallback에서 가짜 분석 내용을 흘림 댓글에 작성
