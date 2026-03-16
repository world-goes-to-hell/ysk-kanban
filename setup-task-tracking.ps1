# ============================================================
# 일감 추적 시스템 설치 스크립트 (Windows PowerShell)
# Claude Code + jira-test MCP 기반 자동 일감 관리 셋업
#
# 사용법: powershell -ExecutionPolicy Bypass -File setup-task-tracking.ps1
# ============================================================

$ErrorActionPreference = "Stop"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  일감 추적 시스템 설치" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# ── 1. API Key 입력 ──
$ApiKey = Read-Host "API Key를 입력하세요"
if (-not $ApiKey) {
    Write-Host "  API Key가 필요합니다." -ForegroundColor Red
    exit 1
}

# ── 2. 설치 위치 감지 ──
$GlobalDir = Join-Path $env:USERPROFILE ".claude"
$ProjectDir = ".claude"

if ((Test-Path $GlobalDir) -and (Test-Path $ProjectDir)) {
    Write-Host ""
    Write-Host "Claude 설정이 두 곳에 존재합니다:"
    Write-Host "  1) 전역 ($GlobalDir) - 모든 프로젝트에 적용"
    Write-Host "  2) 프로젝트 ($ProjectDir) - 이 프로젝트에만 적용"
    $Choice = Read-Host "어디에 설치할까요? (1/2)"
    if ($Choice -eq "2") {
        $BaseDir = $ProjectDir
    } else {
        $BaseDir = $GlobalDir
    }
} elseif (Test-Path $GlobalDir) {
    $BaseDir = $GlobalDir
    Write-Host "  전역 설치 감지: $BaseDir" -ForegroundColor Green
} elseif (Test-Path $ProjectDir) {
    $BaseDir = $ProjectDir
    Write-Host "  프로젝트 설치 감지: $BaseDir" -ForegroundColor Green
} else {
    Write-Host "  Claude 설정 디렉토리를 찾을 수 없습니다." -ForegroundColor Red
    Write-Host "  Claude Code를 먼저 설치해주세요."
    exit 1
}

Write-Host ""

# ── 3. 디렉토리 생성 ──
New-Item -ItemType Directory -Force -Path (Join-Path $BaseDir "rules") | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $BaseDir "hooks") | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $BaseDir "skills") | Out-Null

# ── 4. Rule 파일 생성 ──
$RuleContent = @'
# Task Tracking (CRITICAL)

## 절대 규칙

코드 수정(Edit/Write) 전에 반드시 일감을 먼저 생성하라.

## 적용 조건

- 프로젝트에 `.mcp.json`이 존재하고 일감 관리 MCP 서버가 설정된 경우에만 적용
- 일감 관리 MCP 예시: `jira-test`, `todo`, `task-tracker`, `issue-tracker`
- `.mcp.json`이 없거나 일감 관리 MCP가 없는 프로젝트에서는 이 규칙 무시

## 순서

```
1. 일감 생성 (create_todo 또는 기존 일감 확인)
2. 상태 변경 (IN_PROGRESS)
3. 코드 수정 (Edit/Write)
4. 완료 처리 (DONE)
```

## 적용 제외 (일감 관리 프로젝트 내에서도)

- 설정 파일 수정 (CLAUDE.md, rules, hooks 등 개발 도구 설정)
- 문서만 수정하는 경우 (docs/ 디렉토리)
- 사용자가 명시적으로 일감 불필요라고 말한 경우

## 금지

- 코드를 먼저 수정하고 나중에 일감 생성
- 일감 없이 코드 수정 후 "완료했습니다" 선언
- "간단한 수정이라 일감 불필요"라는 합리화
'@
Set-Content -Path (Join-Path $BaseDir "rules/task-tracking.md") -Value $RuleContent -Encoding UTF8
Write-Host "  rules/task-tracking.md" -ForegroundColor Green

# ── 5. Hook 파일 생성 ──
$HookContent = @'
#!/bin/bash
# PreToolUse hook for Edit/Write
# 일감 관리 MCP가 설정된 프로젝트에서만 동작

INPUT=$(cat)

PROJECT_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)

MCP_FILE="$PROJECT_ROOT/.mcp.json"
if [[ ! -f "$MCP_FILE" ]]; then
  exit 0
fi

if ! grep -qiE '"jira-test"|"todo"|"task-tracker"|"issue-tracker"' "$MCP_FILE" 2>/dev/null; then
  exit 0
fi

FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty' 2>/dev/null)

if [[ -n "$FILE_PATH" ]]; then
  case "$FILE_PATH" in
    *CLAUDE.md*|*rules/*|*hooks/*|*memory/*|*MEMORY.md*|*.claude/*|*docs/plan/*|*docs/fix/*|*docs/brain/*)
      exit 0
      ;;
    *.md)
      exit 0
      ;;
    *.json)
      BASENAME=$(basename "$FILE_PATH")
      case "$BASENAME" in
        settings.json|package.json|package-lock.json|tsconfig.json|*.config.json|.mcp.json)
          exit 0
          ;;
      esac
      ;;
  esac
fi

echo "⚠️ 일감 관리 체크리스트:
1. 일감 생성했는가? (quick_todo 또는 기존 일감 사용)
2. 완료 시 description에 원인/수정파일/변경내용 작성했는가? (update_todo)
3. 완료 시 댓글에 한줄요약 남겼는가? (add_comment, 업무보고 노출용)
4. 상태를 DONE으로 변경했는가? (change_todo_status)"
'@
Set-Content -Path (Join-Path $BaseDir "hooks/task-tracking-guard.sh") -Value $HookContent -Encoding UTF8 -NoNewline
Write-Host "  hooks/task-tracking-guard.sh" -ForegroundColor Green

# ── 6. Skill 파일 생성 ──
$SkillContent = @'
---
description: 작업 이력을 MCP(jira-test)로 자동 추적. 일감 등록, 상태 변경, 댓글 기록을 일관성 있게 수행.
---

# 작업 추적 스킬 (jira-test MCP)

## 절대 규칙

**코드 수정(Edit/Write)이 수반되는 모든 작업은 이 스킬의 워크플로우를 따라야 한다.**
MCP를 직접 호출하든 스킬을 경유하든, 아래 4단계를 반드시 완료해야 한다:

1. 일감 생성 (또는 기존 일감 사용)
2. 코드 수정
3. description에 원인/수정파일/변경내용 기록 (`update_todo`)
4. 댓글에 한줄요약 + DONE 처리 (`add_comment` + `change_todo_status`)

**하나라도 빠뜨리면 작업 미완료로 간주한다.**

## 사용법

`/track <command> [args]`

## Commands

### 작업 시작
`/track start <일감 제목>`
1. `mcp__jira-test__quick_todo`로 일감 생성 + 즉시 IN_PROGRESS 전환 (원콜)
   - description: 작업 배경/목적을 1~2줄로 작성
   - priority: 우선순위 가이드 참고
2. 일감 ID를 사용자에게 알려줌

### 작업 완료
`/track done <일감 ID> [작업 내역]`
1. `mcp__jira-test__update_todo`로 description에 원인/수정파일/변경내용 추가
2. `mcp__jira-test__add_comment`로 한줄요약 댓글 등록
3. `mcp__jira-test__change_todo_status`로 DONE 변경

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

## 기존 일감 기반 작업 규칙

사용자가 일감 번호를 넘겨주며 수정/확인을 요청하면 **새 일감을 만들지 않는다**.
해당 일감 내에서 작업을 이어간다.

### 흐름
1. `mcp__jira-test__get_todo`로 일감 상세 확인
2. 일감 상태가 DONE이면 → IN_PROGRESS로 재오픈
3. 디테일한 수정 이력/원인 분석은 → `update_todo`로 **description(내용)에 추가**
4. 작업 완료 시 → 댓글은 **한 줄 요약만** 남기고 DONE 처리

## 자동 추적 규칙 (필수)

**사용자의 요청이 코드 수정을 수반하면 반드시 일감으로 관리한다.**
질문/조회/설명 요청은 제외. 파일을 Edit/Write 하는 순간 일감 추적 대상이다.

### 코드 수정 시 자동 흐름

1. **작업 시작 전**
   - 일감 번호가 주어졌으면 → 해당 일감 사용 (새로 만들지 않음)
   - 일감 번호 없으면 → `quick_todo`로 생성 + IN_PROGRESS 원콜 전환
   - 일감 제목은 사용자 요청을 한 줄로 요약
   - description에 작업 배경/목적 1~2줄 작성

2. **작업 중**
   - 코드 수정할 때마다 댓글로 기록할 필요 없음
   - 의미 있는 단위(원인 분석, 주요 변경)만 댓글로 기록

3. **작업 완료 (3단계 필수)**
   - ① `update_todo` — description에 디테일 추가 (원인, 수정 파일, 변경 내용)
   - ② `add_comment` — 한줄요약 댓글 (업무보고 노출용)
   - ③ `change_todo_status` → DONE 처리

## 댓글 vs 내용(description) 사용 구분

| 항목 | 어디에 작성 | 예시 |
|------|-----------|------|
| 작업 요약 (한 줄) | **댓글** | "하위 프로젝트 일감 통합 조회 구현" |
| 원인 분석 | **description** | "원인: collectProjectIds에서 재귀 미적용" |
| 수정 파일 목록 | **description** | "수정: TodoService.java, ReportPage.jsx" |
| 디테일한 변경 내용 | **description** | "TodoRepositoryImpl의 projectId 조건을 IN으로 변경" |

### 댓글 작성 규칙
- 한국어, 한 줄, 20자 내외
- 업무보고에서 상사가 읽는다고 생각하고 작성

### description 작성 규칙
- `update_todo`로 기존 description에 **추가** (덮어쓰지 않음)
- 형식: `\n---\n[YYYY-MM-DD] 변경 내역\n- 원인: ...\n- 수정: ...\n- 파일: ...`

## 우선순위 가이드

| 상황 | 우선순위 |
|------|---------|
| 긴급 버그/장애 | HIGHEST |
| 중요 기능 구현 | HIGH |
| 일반 기능/개선 | MEDIUM |
| 리팩토링/정리 | LOW |
| 문서/코멘트 | LOWEST |
'@
Set-Content -Path (Join-Path $BaseDir "skills/track.md") -Value $SkillContent -Encoding UTF8
Write-Host "  skills/track.md" -ForegroundColor Green

# ── 7. settings.json 훅 병합 ──
$SettingsFile = Join-Path $BaseDir "settings.json"
$HookPath = (Join-Path $BaseDir "hooks/task-tracking-guard.sh") -replace '\\', '/'

if (Test-Path $SettingsFile) {
    $settings = Get-Content $SettingsFile -Raw | ConvertFrom-Json

    if (-not $settings.hooks) {
        $settings | Add-Member -NotePropertyName "hooks" -NotePropertyValue @{} -Force
    }
    if (-not $settings.hooks.PreToolUse) {
        $settings.hooks | Add-Member -NotePropertyName "PreToolUse" -NotePropertyValue @() -Force
    }

    $hasEdit = $false
    $hasWrite = $false
    foreach ($entry in $settings.hooks.PreToolUse) {
        if ($entry.matcher -eq "Edit") {
            foreach ($h in $entry.hooks) {
                if ($h.command -like "*task-tracking-guard*") { $hasEdit = $true }
            }
        }
        if ($entry.matcher -eq "Write") {
            foreach ($h in $entry.hooks) {
                if ($h.command -like "*task-tracking-guard*") { $hasWrite = $true }
            }
        }
    }

    if (-not $hasEdit) {
        $settings.hooks.PreToolUse += @{
            matcher = "Edit"
            hooks = @(@{ type = "command"; command = $HookPath; timeout = 5000 })
        }
    }
    if (-not $hasWrite) {
        $settings.hooks.PreToolUse += @{
            matcher = "Write"
            hooks = @(@{ type = "command"; command = $HookPath; timeout = 5000 })
        }
    }

    $settings | ConvertTo-Json -Depth 10 | Set-Content $SettingsFile -Encoding UTF8
    Write-Host "  settings.json 훅 병합 완료" -ForegroundColor Green
} else {
    $newSettings = @{
        hooks = @{
            PreToolUse = @(
                @{
                    matcher = "Edit"
                    hooks = @(@{ type = "command"; command = $HookPath; timeout = 5000 })
                },
                @{
                    matcher = "Write"
                    hooks = @(@{ type = "command"; command = $HookPath; timeout = 5000 })
                }
            )
        }
    }
    $newSettings | ConvertTo-Json -Depth 10 | Set-Content $SettingsFile -Encoding UTF8
    Write-Host "  settings.json 생성 완료" -ForegroundColor Green
}

# ── 8. .mcp.json 생성 ──
$McpJson = @"
{
  "mcpServers": {
    "jira-test": {
      "command": "node",
      "args": ["./mcp-server/src/index.js"],
      "env": {
        "JIRA_TEST_API_URL": "https://kanban.junu.me",
        "JIRA_TEST_API_KEY": "$ApiKey"
      }
    }
  }
}
"@
Set-Content -Path ".mcp.json" -Value $McpJson -Encoding UTF8
Write-Host "  .mcp.json 생성 완료" -ForegroundColor Green

# ── 완료 ──
Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  설치 완료!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "설치된 항목:"
Write-Host "  - rules/task-tracking.md (코드 수정 전 일감 생성 규칙)"
Write-Host "  - hooks/task-tracking-guard.sh (Edit/Write 시 체크리스트)"
Write-Host "  - skills/track.md (/track 명령어)"
Write-Host "  - settings.json (훅 연결)"
Write-Host "  - .mcp.json (MCP 연결 설정)"
Write-Host ""
Write-Host "다음 단계:"
Write-Host "  cd mcp-server; npm install  (아직 안 했다면)"
Write-Host ""
Write-Host "사용법:"
Write-Host "  Claude Code에서 /track start <제목> 으로 일감 시작"
Write-Host "  작업 완료 후 /track done <ID> <한줄요약>"
Write-Host ""
