---
description: 작업 이력을 MCP(jira-test)로 자동 추적. 일감 등록, 상태 변경, 댓글 기록을 일관성 있게 수행.
---

# 작업 추적 스킬 (jira-test MCP)

## 사용법

`/track <command> [args]`

## Commands

### 작업 시작
`/track start <일감 제목>`
1. `mcp__jira-test__create_todo`로 일감 생성 (status: TODO)
2. 즉시 `mcp__jira-test__change_todo_status`로 IN_PROGRESS 변경
3. 일감 ID를 사용자에게 알려줌

### 작업 완료
`/track done <일감 ID> [작업 내역]`
1. 작업 내역이 있으면 `mcp__jira-test__add_comment`로 댓글 등록
2. `mcp__jira-test__change_todo_status`로 DONE 변경

### 작업 기록
`/track log <일감 ID> <내용>`
1. `mcp__jira-test__add_comment`로 작업 내역 댓글 등록

### 일감 목록
`/track list [status]`
1. `mcp__jira-test__list_todos`로 목록 조회
2. status 생략 시 전체, TODO/IN_PROGRESS/DONE 필터 가능

### 일감 상세
`/track show <일감 ID>`
1. `mcp__jira-test__get_todo`로 상세 조회
2. `mcp__jira-test__list_comments`로 댓글 목록도 함께 출력

### 업무보고
`/track report [날짜]`
1. `mcp__jira-test__generate_daily_report`로 업무보고 생성

## 자동 추적 규칙

코딩 작업 중 다음 상황에서 **자동으로** MCP를 활용하라:

1. **버그 수정 시작** → 일감 생성 + IN_PROGRESS
2. **기능 구현 완료** → 작업 내역 댓글 + DONE 처리
3. **중간 진행 상황** → 댓글로 기록 (예: "API 엔드포인트 구현 완료, 프론트엔드 작업 시작")
4. **커밋 직전** → 변경 사항 요약을 댓글로 기록

## 댓글 작성 규칙

- 한국어로 작성
- 구체적인 변경 내용 포함 (파일명, 함수명 등)
- 간결하게 1~3줄로 요약
- 예: "ApiKeyAuthFilter.java 수정 - principal을 username 문자열로 변경하여 인증 오류 해결"

## 우선순위 가이드

| 상황 | 우선순위 |
|------|---------|
| 긴급 버그/장애 | HIGHEST |
| 중요 기능 구현 | HIGH |
| 일반 기능/개선 | MEDIUM |
| 리팩토링/정리 | LOW |
| 문서/코멘트 | LOWEST |
