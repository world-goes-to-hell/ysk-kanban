import { useState, useEffect, useCallback } from 'react';
import Modal from '../common/Modal';
import apiKeyAPI from '../../api/apiKeys';
import setupAPI from '../../api/setup';
import { useToast } from '../../hooks/useToast';
import styles from '../../styles/apiKey.module.css';

function formatDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now - d;
  if (diff < 60000) return '방금 전';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}분 전`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}시간 전`;
  return d.toLocaleDateString('ko-KR');
}

function generateBashScript(apiKey, skillMd) {
  var lines = [];
  lines.push('#!/bin/bash');
  lines.push('# ============================================================');
  lines.push('# 일감 추적 시스템 설치 스크립트');
  lines.push('# Claude Code + jira-test MCP 기반 자동 일감 관리 셋업');
  lines.push('#');
  lines.push('# 사용법: bash setup-task-tracking.sh');
  lines.push('# ============================================================');
  lines.push('');
  lines.push('set -e');
  lines.push('');
  lines.push('echo "=========================================="');
  lines.push('echo "  일감 추적 시스템 설치"');
  lines.push('echo "=========================================="');
  lines.push('echo ""');
  lines.push('');
  lines.push('API_KEY="' + apiKey + '"');
  lines.push('');
  lines.push('# ── 설치 위치 감지 ──');
  lines.push('GLOBAL_DIR="$HOME/.claude"');
  lines.push('PROJECT_DIR=".claude"');
  lines.push('');
  lines.push('if [[ -d "$GLOBAL_DIR" && -d "$PROJECT_DIR" ]]; then');
  lines.push('  echo ""');
  lines.push('  echo "Claude 설정이 두 곳에 존재합니다:"');
  lines.push('  echo "  1) 전역 ($GLOBAL_DIR) — 모든 프로젝트에 적용"');
  lines.push('  echo "  2) 프로젝트 ($PROJECT_DIR) — 이 프로젝트에만 적용"');
  lines.push('  read -rp "어디에 설치할까요? (1/2): " CHOICE');
  lines.push('  if [[ "$CHOICE" == "2" ]]; then');
  lines.push('    BASE_DIR="$PROJECT_DIR"');
  lines.push('  else');
  lines.push('    BASE_DIR="$GLOBAL_DIR"');
  lines.push('  fi');
  lines.push('elif [[ -d "$GLOBAL_DIR" ]]; then');
  lines.push('  BASE_DIR="$GLOBAL_DIR"');
  lines.push('  echo "✅ 전역 설치 감지: $BASE_DIR"');
  lines.push('elif [[ -d "$PROJECT_DIR" ]]; then');
  lines.push('  BASE_DIR="$PROJECT_DIR"');
  lines.push('  echo "✅ 프로젝트 설치 감지: $BASE_DIR"');
  lines.push('else');
  lines.push('  echo "❌ Claude 설정 디렉토리를 찾을 수 없습니다."');
  lines.push('  echo "   Claude Code를 먼저 설치해주세요."');
  lines.push('  exit 1');
  lines.push('fi');
  lines.push('');
  lines.push('echo ""');
  lines.push('');
  lines.push('# ── 디렉토리 생성 ──');
  lines.push('mkdir -p "$BASE_DIR/rules"');
  lines.push('mkdir -p "$BASE_DIR/hooks"');
  lines.push('mkdir -p "$BASE_DIR/skills"');
  lines.push('');
  lines.push("# ── Rule 파일 생성 ──");
  lines.push("cat > \"$BASE_DIR/rules/task-tracking.md\" << 'RULE_EOF'");
  lines.push('# Task Tracking (CRITICAL)');
  lines.push('');
  lines.push('## 절대 규칙');
  lines.push('');
  lines.push('코드 수정(Edit/Write) 전에 반드시 일감을 먼저 생성하라.');
  lines.push('');
  lines.push('## 적용 조건');
  lines.push('');
  lines.push('- 프로젝트에 `.mcp.json`이 존재하고 일감 관리 MCP 서버가 설정된 경우에만 적용');
  lines.push('- 일감 관리 MCP 예시: `jira-test`, `todo`, `task-tracker`, `issue-tracker`');
  lines.push('- `.mcp.json`이 없거나 일감 관리 MCP가 없는 프로젝트에서는 이 규칙 무시');
  lines.push('');
  lines.push('## 순서');
  lines.push('');
  lines.push('```');
  lines.push('1. 일감 생성 (create_todo 또는 기존 일감 확인)');
  lines.push('2. 상태 변경 (IN_PROGRESS)');
  lines.push('3. 코드 수정 (Edit/Write)');
  lines.push('4. 완료 처리 (DONE)');
  lines.push('```');
  lines.push('');
  lines.push('## 적용 제외 (일감 관리 프로젝트 내에서도)');
  lines.push('');
  lines.push('- 설정 파일 수정 (CLAUDE.md, rules, hooks 등 개발 도구 설정)');
  lines.push('- 문서만 수정하는 경우 (docs/ 디렉토리)');
  lines.push('- 사용자가 명시적으로 일감 불필요라고 말한 경우');
  lines.push('');
  lines.push('## 금지');
  lines.push('');
  lines.push('- 코드를 먼저 수정하고 나중에 일감 생성');
  lines.push('- 일감 없이 코드 수정 후 "완료했습니다" 선언');
  lines.push('- "간단한 수정이라 일감 불필요"라는 합리화');
  lines.push('RULE_EOF');
  lines.push('echo "  ✅ rules/task-tracking.md"');
  lines.push('');
  lines.push("# ── Hook 파일 생성 ──");
  lines.push("cat > \"$BASE_DIR/hooks/task-tracking-guard.sh\" << 'HOOK_EOF'");
  lines.push('#!/bin/bash');
  lines.push('INPUT=$(cat)');
  lines.push('PROJECT_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)');
  lines.push('MCP_FILE="$PROJECT_ROOT/.mcp.json"');
  lines.push('if [[ ! -f "$MCP_FILE" ]]; then exit 0; fi');
  lines.push("if ! grep -qiE '\"jira-test\"|\"todo\"|\"task-tracker\"|\"issue-tracker\"' \"$MCP_FILE\" 2>/dev/null; then exit 0; fi");
  lines.push("FILE_PATH=$(echo \"$INPUT\" | jq -r '.tool_input.file_path // empty' 2>/dev/null)");
  lines.push('if [[ -n "$FILE_PATH" ]]; then');
  lines.push('  case "$FILE_PATH" in');
  lines.push('    *CLAUDE.md*|*rules/*|*hooks/*|*memory/*|*MEMORY.md*|*.claude/*|*docs/plan/*|*docs/fix/*|*docs/brain/*) exit 0 ;;');
  lines.push('    *.md) exit 0 ;;');
  lines.push('    *.json) BASENAME=$(basename "$FILE_PATH"); case "$BASENAME" in settings.json|package.json|package-lock.json|tsconfig.json|*.config.json|.mcp.json) exit 0 ;; esac ;;');
  lines.push('  esac');
  lines.push('fi');
  lines.push('echo "⚠️ 일감 관리 체크리스트:');
  lines.push('1. 일감 생성했는가?');
  lines.push('2. 완료 시 description에 원인/수정파일/변경내용 작성했는가?');
  lines.push('3. 완료 시 댓글에 한줄요약 남겼는가?');
  lines.push('4. 상태를 DONE으로 변경했는가?"');
  lines.push('HOOK_EOF');
  lines.push('chmod +x "$BASE_DIR/hooks/task-tracking-guard.sh"');
  lines.push('echo "  ✅ hooks/task-tracking-guard.sh"');
  lines.push('');
  lines.push("# ── Skill 파일 생성 ──");
  lines.push('mkdir -p "$BASE_DIR/skills/track"');
  lines.push("cat > \"$BASE_DIR/skills/track/SKILL.md\" << 'SKILL_EOF'");
  if (skillMd && skillMd.length > 0) {
    skillMd.split('\n').forEach(function (l) { lines.push(l); });
  } else {
    lines.push('---');
    lines.push('description: 작업 이력을 MCP(jira-test)로 자동 추적. 일감 등록, 상태 변경, 댓글 기록을 일관성 있게 수행.');
    lines.push('---');
    lines.push('');
    lines.push('# 작업 추적 스킬 (jira-test MCP)');
    lines.push('');
    lines.push('## 사용법');
    lines.push('`/track <command> [args]`');
    lines.push('');
    lines.push('### 작업 시작');
    lines.push('`/track start <일감 제목>`');
    lines.push('### 작업 완료');
    lines.push('`/track done <일감 ID> [작업 내역]`');
    lines.push('### 일감 목록');
    lines.push('`/track list [status]`');
    lines.push('### 업무보고');
    lines.push('`/track report [날짜]`');
  }
  lines.push('SKILL_EOF');
  lines.push('echo "  ✅ skills/track/SKILL.md"');
  lines.push('');
  lines.push('# ── settings.json 훅 병합 ──');
  lines.push('SETTINGS_FILE="$BASE_DIR/settings.json"');
  lines.push('if [[ -f "$SETTINGS_FILE" ]]; then');
  lines.push('  if command -v node &>/dev/null; then');
  lines.push('    node -e "');
  lines.push("const fs = require('fs');");
  lines.push("const settings = JSON.parse(fs.readFileSync('$SETTINGS_FILE', 'utf8'));");
  lines.push('if (!settings.hooks) settings.hooks = {};');
  lines.push('if (!settings.hooks.PreToolUse) settings.hooks.PreToolUse = [];');
  lines.push("const hookPath = '$BASE_DIR/hooks/task-tracking-guard.sh';");
  lines.push("const editHook = { matcher: 'Edit', hooks: [{ type: 'command', command: hookPath, timeout: 5000 }] };");
  lines.push("const writeHook = { matcher: 'Write', hooks: [{ type: 'command', command: hookPath, timeout: 5000 }] };");
  lines.push("const hasEdit = settings.hooks.PreToolUse.some(h => h.matcher === 'Edit' && h.hooks?.some(hh => hh.command?.includes('task-tracking-guard')));");
  lines.push("const hasWrite = settings.hooks.PreToolUse.some(h => h.matcher === 'Write' && h.hooks?.some(hh => hh.command?.includes('task-tracking-guard')));");
  lines.push('if (!hasEdit) settings.hooks.PreToolUse.push(editHook);');
  lines.push('if (!hasWrite) settings.hooks.PreToolUse.push(writeHook);');
  lines.push("fs.writeFileSync('$SETTINGS_FILE', JSON.stringify(settings, null, 2));");
  lines.push('"');
  lines.push('    echo "  ✅ settings.json 훅 병합 완료"');
  lines.push('  else');
  lines.push('    echo "  ⚠️ Node.js가 없어서 settings.json 자동 병합 불가"');
  lines.push('  fi');
  lines.push('else');
  lines.push('  cat > "$SETTINGS_FILE" << SETTINGS_EOF');
  lines.push('{');
  lines.push('  "hooks": {');
  lines.push('    "PreToolUse": [');
  lines.push('      { "matcher": "Edit", "hooks": [{ "type": "command", "command": "$BASE_DIR/hooks/task-tracking-guard.sh", "timeout": 5000 }] },');
  lines.push('      { "matcher": "Write", "hooks": [{ "type": "command", "command": "$BASE_DIR/hooks/task-tracking-guard.sh", "timeout": 5000 }] }');
  lines.push('    ]');
  lines.push('  }');
  lines.push('}');
  lines.push('SETTINGS_EOF');
  lines.push('  echo "  ✅ settings.json 생성 완료"');
  lines.push('fi');
  lines.push('');
  lines.push('# ── .mcp.json 생성 ──');
  lines.push('PROJECT_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)');
  lines.push('cat > "$PROJECT_ROOT/.mcp.json" << MCP_JSON_EOF');
  lines.push('{');
  lines.push('  "mcpServers": {');
  lines.push('    "jira-test": {');
  lines.push('      "command": "npx",');
  lines.push('      "args": ["-y", "@dksktjdrhks2/kanban-mcp"],');
  lines.push('      "env": {');
  lines.push('        "JIRA_TEST_API_URL": "https://kanban.junu.me",');
  lines.push('        "JIRA_TEST_API_KEY": "$API_KEY"');
  lines.push('      }');
  lines.push('    }');
  lines.push('  }');
  lines.push('}');
  lines.push('MCP_JSON_EOF');
  lines.push('echo "  ✅ .mcp.json 생성 완료"');
  lines.push('');
  lines.push('echo ""');
  lines.push('echo "=========================================="');
  lines.push('echo "  ✅ 설치 완료!"');
  lines.push('echo "=========================================="');
  lines.push('echo ""');
  lines.push('echo "사용법:"');
  lines.push('echo "  Claude Code에서 /track start <제목> 으로 일감 시작"');
  lines.push('echo "  작업 완료 후 /track done <ID> <한줄요약>"');
  lines.push('echo ""');
  return lines.join('\n');
}

function generatePowershellScript(apiKey, skillMd) {
  var lines = [];
  lines.push('# ============================================================');
  lines.push('# 일감 추적 시스템 설치 스크립트 (Windows PowerShell)');
  lines.push('# Claude Code + jira-test MCP 기반 자동 일감 관리 셋업');
  lines.push('#');
  lines.push('# 사용법: powershell -ExecutionPolicy Bypass -File setup-task-tracking.ps1');
  lines.push('# ============================================================');
  lines.push('');
  lines.push('$ErrorActionPreference = "Stop"');
  lines.push('[Console]::OutputEncoding = [System.Text.Encoding]::UTF8');
  lines.push('$OutputEncoding = [System.Text.Encoding]::UTF8');
  lines.push('');
  lines.push('Write-Host "==========================================" -ForegroundColor Cyan');
  lines.push('Write-Host "  일감 추적 시스템 설치" -ForegroundColor Cyan');
  lines.push('Write-Host "==========================================" -ForegroundColor Cyan');
  lines.push('Write-Host ""');
  lines.push('');
  lines.push('$ApiKey = "' + apiKey + '"');
  lines.push('');
  lines.push('# ── 설치 위치 감지 ──');
  lines.push('$GlobalDir = Join-Path $env:USERPROFILE ".claude"');
  lines.push('$ProjectDir = ".claude"');
  lines.push('');
  lines.push('if ((Test-Path $GlobalDir) -and (Test-Path $ProjectDir)) {');
  lines.push('    Write-Host ""');
  lines.push('    Write-Host "Claude 설정이 두 곳에 존재합니다:"');
  lines.push('    Write-Host "  1) 전역 ($GlobalDir) - 모든 프로젝트에 적용"');
  lines.push('    Write-Host "  2) 프로젝트 ($ProjectDir) - 이 프로젝트에만 적용"');
  lines.push('    $Choice = Read-Host "어디에 설치할까요? (1/2)"');
  lines.push('    if ($Choice -eq "2") { $BaseDir = $ProjectDir } else { $BaseDir = $GlobalDir }');
  lines.push('} elseif (Test-Path $GlobalDir) {');
  lines.push('    $BaseDir = $GlobalDir');
  lines.push('    Write-Host "  전역 설치 감지: $BaseDir" -ForegroundColor Green');
  lines.push('} elseif (Test-Path $ProjectDir) {');
  lines.push('    $BaseDir = $ProjectDir');
  lines.push('    Write-Host "  프로젝트 설치 감지: $BaseDir" -ForegroundColor Green');
  lines.push('} else {');
  lines.push('    Write-Host "  Claude 설정 디렉토리를 찾을 수 없습니다." -ForegroundColor Red');
  lines.push('    exit 1');
  lines.push('}');
  lines.push('');
  lines.push('Write-Host ""');
  lines.push('');
  lines.push('# ── 디렉토리 생성 ──');
  lines.push('New-Item -ItemType Directory -Force -Path (Join-Path $BaseDir "rules") | Out-Null');
  lines.push('New-Item -ItemType Directory -Force -Path (Join-Path $BaseDir "hooks") | Out-Null');
  lines.push('New-Item -ItemType Directory -Force -Path (Join-Path $BaseDir "skills") | Out-Null');
  lines.push('');
  lines.push("# ── Rule 파일 생성 ──");
  lines.push("$RuleContent = @'");
  lines.push('# Task Tracking (CRITICAL)');
  lines.push('');
  lines.push('## 절대 규칙');
  lines.push('');
  lines.push('코드 수정(Edit/Write) 전에 반드시 일감을 먼저 생성하라.');
  lines.push('');
  lines.push('## 순서');
  lines.push('');
  lines.push('1. 일감 생성 (create_todo 또는 기존 일감 확인)');
  lines.push('2. 상태 변경 (IN_PROGRESS)');
  lines.push('3. 코드 수정 (Edit/Write)');
  lines.push('4. 완료 처리 (DONE)');
  lines.push('');
  lines.push('## 금지');
  lines.push('');
  lines.push('- 코드를 먼저 수정하고 나중에 일감 생성');
  lines.push('- 일감 없이 코드 수정 후 "완료했습니다" 선언');
  lines.push("'@");
  lines.push('Set-Content -Path (Join-Path $BaseDir "rules/task-tracking.md") -Value $RuleContent -Encoding UTF8');
  lines.push('Write-Host "  rules/task-tracking.md" -ForegroundColor Green');
  lines.push('');
  lines.push("# ── Hook 파일 생성 ──");
  lines.push("$HookContent = @'");
  lines.push('#!/bin/bash');
  lines.push('INPUT=$(cat)');
  lines.push('PROJECT_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)');
  lines.push('MCP_FILE="$PROJECT_ROOT/.mcp.json"');
  lines.push('if [[ ! -f "$MCP_FILE" ]]; then exit 0; fi');
  lines.push("if ! grep -qiE '\"jira-test\"|\"todo\"|\"task-tracker\"|\"issue-tracker\"' \"$MCP_FILE\" 2>/dev/null; then exit 0; fi");
  lines.push("FILE_PATH=$(echo \"$INPUT\" | jq -r '.tool_input.file_path // empty' 2>/dev/null)");
  lines.push('if [[ -n "$FILE_PATH" ]]; then');
  lines.push('  case "$FILE_PATH" in');
  lines.push('    *CLAUDE.md*|*rules/*|*hooks/*|*memory/*|*MEMORY.md*|*.claude/*|*docs/*) exit 0 ;;');
  lines.push('    *.md) exit 0 ;;');
  lines.push('    *.json) BASENAME=$(basename "$FILE_PATH"); case "$BASENAME" in settings.json|package.json|*.config.json|.mcp.json) exit 0 ;; esac ;;');
  lines.push('  esac');
  lines.push('fi');
  lines.push('echo "일감 관리 체크리스트: 일감 생성 -> 코드 수정 -> description 업데이트 -> 댓글 한줄요약 -> DONE"');
  lines.push("'@");
  lines.push('Set-Content -Path (Join-Path $BaseDir "hooks/task-tracking-guard.sh") -Value $HookContent -Encoding UTF8 -NoNewline');
  lines.push('Write-Host "  hooks/task-tracking-guard.sh" -ForegroundColor Green');
  lines.push('');
  lines.push("# ── Skill 파일 생성 ──");
  lines.push("$SkillContent = @'");
  if (skillMd && skillMd.length > 0) {
    skillMd.split('\n').forEach(function (l) { lines.push(l); });
  } else {
    lines.push('---');
    lines.push('description: 작업 이력을 MCP(jira-test)로 자동 추적.');
    lines.push('---');
    lines.push('# 작업 추적 스킬 (jira-test MCP)');
    lines.push('## 사용법');
    lines.push('/track start <제목> - 일감 시작');
    lines.push('/track done <ID> <한줄요약> - 작업 완료');
    lines.push('/track list [status] - 일감 목록');
    lines.push('/track report [날짜] - 업무보고');
  }
  lines.push("'@");
  lines.push('New-Item -ItemType Directory -Force -Path (Join-Path $BaseDir "skills/track") | Out-Null');
  lines.push('Set-Content -Path (Join-Path $BaseDir "skills/track/SKILL.md") -Value $SkillContent -Encoding UTF8');
  lines.push('Write-Host "  skills/track/SKILL.md" -ForegroundColor Green');
  lines.push('');
  lines.push('# ── settings.json 훅 병합 ──');
  lines.push('$SettingsFile = Join-Path $BaseDir "settings.json"');
  lines.push("$HookPath = (Join-Path $BaseDir \"hooks/task-tracking-guard.sh\") -replace '\\\\', '/'");
  lines.push('');
  lines.push('if (Test-Path $SettingsFile) {');
  lines.push('    $settings = Get-Content $SettingsFile -Raw | ConvertFrom-Json');
  lines.push('    if (-not $settings.hooks) { $settings | Add-Member -NotePropertyName "hooks" -NotePropertyValue @{} -Force }');
  lines.push('    if (-not $settings.hooks.PreToolUse) { $settings.hooks | Add-Member -NotePropertyName "PreToolUse" -NotePropertyValue @() -Force }');
  lines.push('    $hasEdit = $false; $hasWrite = $false');
  lines.push('    foreach ($entry in $settings.hooks.PreToolUse) {');
  lines.push('        if ($entry.matcher -eq "Edit") { foreach ($h in $entry.hooks) { if ($h.command -like "*task-tracking-guard*") { $hasEdit = $true } } }');
  lines.push('        if ($entry.matcher -eq "Write") { foreach ($h in $entry.hooks) { if ($h.command -like "*task-tracking-guard*") { $hasWrite = $true } } }');
  lines.push('    }');
  lines.push('    if (-not $hasEdit) { $settings.hooks.PreToolUse += @{ matcher = "Edit"; hooks = @(@{ type = "command"; command = $HookPath; timeout = 5000 }) } }');
  lines.push('    if (-not $hasWrite) { $settings.hooks.PreToolUse += @{ matcher = "Write"; hooks = @(@{ type = "command"; command = $HookPath; timeout = 5000 }) } }');
  lines.push('    $settings | ConvertTo-Json -Depth 10 | Set-Content $SettingsFile -Encoding UTF8');
  lines.push('    Write-Host "  settings.json 훅 병합 완료" -ForegroundColor Green');
  lines.push('} else {');
  lines.push('    $newSettings = @{ hooks = @{ PreToolUse = @( @{ matcher = "Edit"; hooks = @(@{ type = "command"; command = $HookPath; timeout = 5000 }) }, @{ matcher = "Write"; hooks = @(@{ type = "command"; command = $HookPath; timeout = 5000 }) } ) } }');
  lines.push('    $newSettings | ConvertTo-Json -Depth 10 | Set-Content $SettingsFile -Encoding UTF8');
  lines.push('    Write-Host "  settings.json 생성 완료" -ForegroundColor Green');
  lines.push('}');
  lines.push('');
  lines.push('# ── .mcp.json 생성 ──');
  lines.push('$McpJson = @"');
  lines.push('{');
  lines.push('  "mcpServers": {');
  lines.push('    "jira-test": {');
  lines.push('      "command": "npx",');
  lines.push('      "args": ["-y", "@dksktjdrhks2/kanban-mcp"],');
  lines.push('      "env": {');
  lines.push('        "JIRA_TEST_API_URL": "https://kanban.junu.me",');
  lines.push('        "JIRA_TEST_API_KEY": "$ApiKey"');
  lines.push('      }');
  lines.push('    }');
  lines.push('  }');
  lines.push('}');
  lines.push('"@');
  lines.push('Set-Content -Path ".mcp.json" -Value $McpJson -Encoding UTF8');
  lines.push('Write-Host "  .mcp.json 생성 완료" -ForegroundColor Green');
  lines.push('');
  lines.push('Write-Host ""');
  lines.push('Write-Host "==========================================" -ForegroundColor Cyan');
  lines.push('Write-Host "  설치 완료!" -ForegroundColor Green');
  lines.push('Write-Host "==========================================" -ForegroundColor Cyan');
  lines.push('Write-Host ""');
  lines.push('Write-Host "사용법:"');
  lines.push('Write-Host "  Claude Code에서 /track start <제목> 으로 일감 시작"');
  lines.push('Write-Host "  작업 완료 후 /track done <ID> <한줄요약>"');
  lines.push('Write-Host ""');
  return lines.join('\r\n');
}

export async function handleScriptDownload(apiKey, type) {
  var skillMd = null;
  try {
    var data = await setupAPI.getTrackSkill();
    skillMd = data && data.content ? data.content : null;
  } catch (e) {
    // 서버에서 최신 SKILL.md를 못 가져오면 embedded fallback 사용
    skillMd = null;
  }
  var script = type === 'bash'
    ? generateBashScript(apiKey, skillMd)
    : generatePowershellScript(apiKey, skillMd);
  var filename = type === 'bash' ? 'setup-task-tracking.sh' : 'setup-task-tracking.ps1';
  var bom = type === 'powershell' ? '\uFEFF' : '';
  var blob = new Blob([bom + script], { type: 'text/plain;charset=utf-8' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function ApiKeyModal({ projectId, projectName, onClose }) {
  const showToast = useToast();
  const [keys, setKeys] = useState([]);
  const [name, setName] = useState('');
  const [expiresInDays, setExpiresInDays] = useState(0);
  const [createdKey, setCreatedKey] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadKeys = useCallback(async () => {
    try {
      const data = await apiKeyAPI.list(projectId);
      setKeys(data);
    } catch (err) {
      showToast('API Key 목록 조회 실패', 'error');
    }
  }, [projectId, showToast]);

  useEffect(() => {
    loadKeys();
  }, [loadKeys]);

  const handleCreate = async () => {
    if (!name.trim()) {
      showToast('키 이름을 입력하세요', 'error');
      return;
    }
    setLoading(true);
    try {
      const result = await apiKeyAPI.create(projectId, {
        name: name.trim(),
        expiresInDays: expiresInDays || null,
      });
      setCreatedKey(result.rawKey);
      setName('');
      setExpiresInDays(0);
      loadKeys();
      showToast('API Key가 생성되었습니다', 'success');
    } catch (err) {
      showToast('API Key 생성 실패', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (keyId) => {
    try {
      await apiKeyAPI.revoke(projectId, keyId);
      loadKeys();
      showToast('API Key가 폐기되었습니다', 'success');
    } catch (err) {
      showToast('API Key 폐기 실패', 'error');
    }
  };

  const handleCopy = async () => {
    if (!createdKey) return;
    try {
      await navigator.clipboard.writeText(createdKey);
      showToast('클립보드에 복사되었습니다', 'success');
    } catch (_) {
      showToast('복사 실패', 'error');
    }
  };

  return (
    <Modal title={`API Key 관리 - ${projectName || '프로젝트'}`} onClose={onClose}>
      <div className={styles.section}>
        <div className={styles.createForm}>
          <input
            type="text"
            placeholder="키 이름 (예: Claude Code)"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
          />
          <select value={expiresInDays} onChange={e => setExpiresInDays(Number(e.target.value))}>
            <option value={0}>만료 없음</option>
            <option value={30}>30일</option>
            <option value={90}>90일</option>
            <option value={180}>180일</option>
            <option value={365}>365일</option>
          </select>
          <button className="btn btn-primary" onClick={handleCreate} disabled={loading}>
            생성
          </button>
        </div>

        {createdKey && (
          <div className={styles.createdKeyBox}>
            <span className={styles.label}>생성된 키 (이 창을 닫으면 다시 볼 수 없습니다)</span>
            <div className={styles.createdKeyRow}>
              <span className={styles.keyText}>{createdKey}</span>
              <button className={styles.copyBtn} onClick={handleCopy}>복사</button>
            </div>
            <div className={styles.downloadRow}>
              <button className={styles.downloadBtn} onClick={() => handleScriptDownload(createdKey, 'bash')}>
                셋업 스크립트 (Bash)
              </button>
              <button className={styles.downloadBtn} onClick={() => handleScriptDownload(createdKey, 'powershell')}>
                셋업 스크립트 (PowerShell)
              </button>
            </div>
          </div>
        )}

        {keys.length === 0 ? (
          <div className={styles.emptyMsg}>발급된 API Key가 없습니다</div>
        ) : (
          <table className={styles.keyTable}>
            <thead>
              <tr>
                <th>이름</th>
                <th>Prefix</th>
                <th>생성자</th>
                <th>마지막 사용</th>
                <th>만료</th>
                <th>작업</th>
              </tr>
            </thead>
            <tbody>
              {keys.map(k => (
                <tr key={k.id}>
                  <td>{k.name}</td>
                  <td style={{ fontFamily: 'monospace' }}>{k.prefix}...</td>
                  <td>{k.createdByName}</td>
                  <td>{k.lastUsedAt ? formatDate(k.lastUsedAt) : '사용 안 함'}</td>
                  <td>{k.expiresAt ? new Date(k.expiresAt).toLocaleDateString('ko-KR') : '없음'}</td>
                  <td>
                    <button className={styles.revokeBtn} onClick={() => handleRevoke(k.id)}>
                      폐기
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Modal>
  );
}
