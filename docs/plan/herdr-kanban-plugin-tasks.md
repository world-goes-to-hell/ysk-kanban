# Herdr 칸반 플러그인 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 칸반 보드를 Herdr pane 안에서 키보드와 마우스로 전부 조작할 수 있는 TUI 플러그인을 만든다.

**Architecture:** Node.js + Ink 로 만든 단일 프로세스 TUI 다. 레이아웃을 직접 계산해 그 결과를 렌더링과 마우스 히트 판정 양쪽에 쓰고, 칸반 REST API 를 API Key 로 호출하며, SSE 로 실시간 갱신을 받는다. 백엔드는 수정하지 않는다.

**Tech Stack:** Node.js 22+, Ink 7, React 19, vitest 4, ink-testing-library, fetch(Node 내장)

**Spec:** `docs/plan/herdr-kanban-plugin.md`

## Global Constraints

- 플러그인 id 는 `herdr-kanban` 으로 고정한다. 저장소명(`ysk-kanban`)·디렉토리명(`herdr-plugin`)과 다르다.
- 디렉토리는 저장소 루트의 `herdr-plugin/` 이다.
- Node.js 22 이상. `package.json` 의 `engines.node` 에 `>=22.0.0` 을 명시한다.
  ink@7 자신이 `engines: {node: ">=22"}` 를 선언하므로 이보다 낮게 적으면 거짓 선언이 된다.
  npm 은 engine-strict 가 꺼져 있어 Node 18~21 에서도 설치는 성공하고 실행에서 깨진다.
- ESM 전용이다. `package.json` 에 `"type": "module"` 을 넣고 모든 import 에 확장자를 붙인다.
- 네이티브 모듈을 쓰지 않는다. 컴파일 단계가 없어야 한다.
- React 는 19 계열을 쓴다. Ink 6 과 7 모두 `react >=19` 를 peer 로 요구하므로
  Ink 를 낮춰도 React 18 을 쓸 수 없다. `--legacy-peer-deps` 로 우회하지 않는다.
- 백엔드(`src/main/java/**`)와 `mcp-server/**` 는 이 계획에서 수정하지 않는다.
- API 기본 URL 은 `https://kanban.yooit.kr` 이며 설정으로 덮어쓸 수 있다.
- 인증 헤더는 `Authorization: Bearer ak_...` 형식이다.
- 모든 파일은 800줄을 넘지 않는다. 함수는 50줄을 넘지 않는다.
- 테스트 커버리지 80% 이상을 목표로 한다.
- Windows pane 은 PowerShell 5.1 일 수 있다. 셸 명령을 연결할 때 `&&` 대신 `;` 를 쓴다.
- 사용자에게 보이는 문구는 한국어로 쓴다.

## 공통 타입

여러 태스크가 아래 형태를 공유한다. 태스크를 순서 없이 읽어도 되도록 여기에 모아 둔다.

```js
// 칸(상태) — GET /api/statuses?projectId= 의 원소
// { id, statusKey, name, color, semanticStatus, position, active }

// 카드(일감) — GET /api/todos?projectId= 의 원소
// { id, summary, description, status, statusKey, priority, dueDate,
//   assignees: [{ id, username }], subtaskTotal, subtaskDone,
//   hasActiveDiscussion, createdAt, updatedAt, completedAt }

// 프로젝트 — GET /api/projects 의 원소
// { id, name, projectKey }

// 레이아웃 조각 — layout.js 가 만드는 배열의 원소
// { kind: 'card'|'column-header'|'project-name', id, x, y, w, h }
```

---

## Phase 1 — 기반과 환경 검증

이 단계가 끝나면 Herdr pane 에서 플러그인이 뜨고 칸반 데이터를 가져와 텍스트로 출력한다.

### Task 1: 스캐폴딩과 Windows pane 기동 검증

가장 먼저 하는 이유는 여기서 막히면 뒤의 모든 작업이 무의미하기 때문이다.
herdr-grid 가 쓰는 검증된 패턴을 그대로 따른다.

**Files:**
- Create: `herdr-plugin/package.json`
- Create: `herdr-plugin/herdr-plugin.toml`
- Create: `herdr-plugin/src/cli.js`
- Create: `herdr-plugin/.gitignore`
- Create: `herdr-plugin/vitest.config.js`

**Interfaces:**
- Consumes: 없음 (첫 태스크)
- Produces: `src/cli.js` 가 실행 진입점이다. 이후 모든 태스크가 여기에 연결된다.

- [ ] **Step 1: package.json 작성**

```json
{
  "name": "@dksktjdrhks2/herdr-kanban",
  "version": "0.1.0",
  "description": "Herdr plugin for kanban board — full CRUD in the terminal",
  "type": "module",
  "bin": { "herdr-kanban": "src/cli.js" },
  "engines": { "node": ">=22.0.0" },
  "scripts": {
    "start": "node src/cli.js",
    "test": "vitest run",
    "test:watch": "vitest",
    "coverage": "vitest run --coverage"
  },
  "dependencies": {
    "ink": "^7.1.1",
    "react": "^19.2.8"
  },
  "devDependencies": {
    "vitest": "^4.1.11",
    "ink-testing-library": "^4.0.0",
    "@vitest/coverage-v8": "^4.1.11"
  }
}
```

- [ ] **Step 2: 최소 진입점 작성**

이 단계에서는 Ink 를 쓰지 않는다. 프로세스가 뜨는지만 확인한다.

```js
#!/usr/bin/env node
// herdr-plugin/src/cli.js
console.log('herdr-kanban 기동 확인');
console.log('plugin root:', process.env.HERDR_PLUGIN_ROOT ?? '(없음)');
console.log('pane id    :', process.env.HERDR_PANE_ID ?? '(없음)');
console.log('터미널 크기:', process.stdout.columns, 'x', process.stdout.rows);
console.log('아무 키나 누르면 종료합니다.');
process.stdin.setRawMode?.(true);
process.stdin.resume();
process.stdin.once('data', () => process.exit(0));
```

- [ ] **Step 3: 매니페스트 작성**

Windows 의 `[[panes]]` 상대경로 문제를 herdr-grid 와 같은 방식으로 우회한다.
`HERDR_PLUGIN_ROOT` 는 `\\?\` 확장 경로 접두사가 붙어 오므로 반드시 잘라낸다.

```toml
id = "herdr-kanban"
name = "herdr-kanban"
version = "0.1.0"
description = "칸반 보드를 터미널에서 조회하고 편집하는 플러그인"
min_herdr_version = "0.8.0"
platforms = ["linux", "macos", "windows"]

[[build]]
platforms = ["linux", "macos", "windows"]
command = ["npm", "ci", "--omit=dev"]

# Windows: 상대경로 [[panes]] 가 동작하지 않으므로 PowerShell 로 감싸고
# HERDR_PLUGIN_ROOT 의 \\?\ 접두사를 제거한 뒤 절대경로로 실행한다.
[[panes]]
id = "board"
platforms = ["windows"]
title = "칸반"
placement = "split"
command = ["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", '$r=$env:HERDR_PLUGIN_ROOT; if($r.StartsWith("\\?\")){$r=$r.Substring(4)}; node (Join-Path $r "src\cli.js")']

[[panes]]
id = "board-unix"
platforms = ["linux", "macos"]
title = "칸반"
placement = "split"
command = ["node", "./src/cli.js"]
```

- [ ] **Step 4: .gitignore 와 vitest 설정 작성**

```
node_modules/
coverage/
```

```js
// herdr-plugin/vitest.config.js
export default {
  test: {
    include: ['test/**/*.test.js'],
    coverage: { provider: 'v8', reporter: ['text', 'json-summary'] },
  },
};
```

- [ ] **Step 5: 의존성 설치**

Run: `cd herdr-plugin; npm install`
Expected: `node_modules/` 생성, 오류 없음

- [ ] **Step 6: 로컬 등록**

Run: `cd herdr-plugin; herdr plugin link .`
그 다음 Run: `herdr plugin list --json`
Expected: 출력에 `"plugin_id":"herdr-kanban"` 이 보인다

- [ ] **Step 7: pane 기동 검증 — 이 계획의 첫 관문**

Run: `herdr plugin pane open --plugin herdr-kanban --entrypoint board --placement split --no-focus`

응답의 `.result.pane.pane_id` 를 읽어 다음을 실행한다.

Run: `herdr pane read <pane_id> --source recent-unwrapped --lines 20`

Expected: "herdr-kanban 기동 확인" 과 함께 plugin root, pane id, 터미널 크기가 보인다.

**실패했다면** 여기서 멈추고 다음을 시도한다.
1. `herdr plugin log list --plugin herdr-kanban` 으로 오류 확인
2. 그래도 안 되면 herdr-sidebar 방식으로 전환한다.
   `[[panes]]` 대신 `[[actions]]` 를 두고, 액션이 `herdr pane split` 을 호출한 뒤
   새 pane 의 PATH 에 플러그인 디렉토리를 넣고 명령 이름만 입력하는 방식이다.
   전환했다면 이 계획서의 Task 1 Step 3 을 실제 방식으로 고쳐 둔다.

- [ ] **Step 8: 정리와 커밋**

Run: `herdr plugin pane close <pane_id>`

```bash
git add herdr-plugin/
git commit -m "feat(herdr-plugin): 스캐폴딩과 pane 기동 검증"
```

---

### Task 2: 마우스와 색상 지원 확인

Task 1 과 분리하는 이유는, 여기서 실패하면 설계의 드래그 앤 드롭을 접고
사용자와 다시 논의해야 하기 때문이다. 코드를 더 쌓기 전에 확인한다.

**Files:**
- Create: `herdr-plugin/scripts/probe-terminal.js`

**Interfaces:**
- Consumes: Task 1 의 `herdr-plugin/` 디렉토리
- Produces: 없음 (검증 전용, 이후 삭제)

- [ ] **Step 1: 탐침 스크립트 작성**

```js
#!/usr/bin/env node
// herdr-plugin/scripts/probe-terminal.js
// 마우스 이벤트 도달 여부와 트루컬러 지원을 확인한다.

const out = process.stdout;

// 트루컬러 확인: 24비트 색으로 사각형을 찍는다
out.write('트루컬러 확인 — 세 칸이 서로 다른 색이면 지원됩니다:\n');
for (const [r, g, b] of [[37, 99, 235], [217, 119, 6], [5, 150, 105]]) {
  out.write(`\x1b[48;2;${r};${g};${b}m    \x1b[0m `);
}
out.write('\n\n');

// 마우스 캡처 활성화: 일반 클릭 + 드래그 추적 + SGR 확장 좌표
out.write('\x1b[?1000h\x1b[?1002h\x1b[?1006h');
out.write('마우스를 클릭하거나 드래그해 보세요. q 를 누르면 종료합니다.\n\n');

process.stdin.setRawMode(true);
process.stdin.resume();

let events = 0;
process.stdin.on('data', (buf) => {
  const s = buf.toString();
  if (s === 'q') return finish();

  // SGR 마우스 형식: ESC [ < 버튼 ; 열 ; 행 (M=누름, m=뗌)
  const m = /\x1b\[<(\d+);(\d+);(\d+)([Mm])/.exec(s);
  if (m) {
    events += 1;
    const [, btn, col, row, kind] = m;
    out.write(`  마우스 ${kind === 'M' ? '누름' : '뗌  '} 버튼=${btn} 좌표=(${col}, ${row})\n`);
  } else {
    out.write(`  키 입력: ${JSON.stringify(s)}\n`);
  }
});

function finish() {
  out.write('\x1b[?1006l\x1b[?1002l\x1b[?1000l');
  out.write(`\n마우스 이벤트 ${events}건 수신.\n`);
  out.write(events > 0 ? '=> 마우스 지원 확인됨\n' : '=> 마우스 이벤트가 오지 않음\n');
  process.stdin.setRawMode(false);
  process.exit(0);
}

process.on('exit', () => out.write('\x1b[?1006l\x1b[?1002l\x1b[?1000l'));
```

- [ ] **Step 2: Herdr pane 에서 실행**

Run: `herdr pane split --current --direction right --cwd "$PWD" --no-focus`
새 pane id 를 `.result.pane.pane_id` 에서 읽고,

Run: `herdr pane run <pane_id> "node herdr-plugin/scripts/probe-terminal.js"`

**사용자에게 그 pane 을 클릭하고 드래그해 달라고 요청한다.** 자동화할 수 없다.

Run: `herdr pane read <pane_id> --source recent-unwrapped --lines 30`

Expected: 마우스 누름·뗌 이벤트가 좌표와 함께 찍히고, 색 사각형 세 개가 서로 다르다

- [ ] **Step 3: 결과 기록**

설계 문서 `docs/plan/herdr-kanban-plugin.md` 의 "검증 계획" 표에
확인 결과를 날짜와 함께 적는다. 실패 항목이 있으면 대응 방침도 함께 적는다.

- [ ] **Step 4: 정리와 커밋**

```bash
git add herdr-plugin/scripts/probe-terminal.js docs/plan/herdr-kanban-plugin.md
git commit -m "test(herdr-plugin): 마우스·트루컬러 지원 확인"
```

---

### Task 3: 설정 로드와 저장

**Files:**
- Create: `herdr-plugin/src/config.js`
- Test: `herdr-plugin/test/config.test.js`

**Interfaces:**
- Consumes: 없음
- Produces:
  - `loadConfig(dir?) -> { apiUrl, keys: [{label, key}], lastProjectId }`
  - `saveConfig(cfg, dir?) -> void`
  - `configDir() -> string`
  - `DEFAULT_API_URL` 상수

- [ ] **Step 1: 실패하는 테스트 작성**

```js
// herdr-plugin/test/config.test.js
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { loadConfig, saveConfig, DEFAULT_API_URL } from '../src/config.js';

let dir;
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'hk-')); });
afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

describe('loadConfig', () => {
  it('설정 파일이 없으면 기본값을 돌려준다', () => {
    const cfg = loadConfig(dir);
    expect(cfg.apiUrl).toBe(DEFAULT_API_URL);
    expect(cfg.keys).toEqual([]);
    expect(cfg.lastProjectId).toBeNull();
  });

  it('저장된 설정을 읽는다', () => {
    writeFileSync(join(dir, 'config.json'), JSON.stringify({
      apiUrl: 'http://localhost:8080',
      keys: [{ label: 'MBRIS', key: 'ak_test' }],
      lastProjectId: 3,
    }));
    const cfg = loadConfig(dir);
    expect(cfg.apiUrl).toBe('http://localhost:8080');
    expect(cfg.keys[0].label).toBe('MBRIS');
    expect(cfg.lastProjectId).toBe(3);
  });

  it('깨진 JSON 이면 기본값으로 되돌리고 예외를 던지지 않는다', () => {
    writeFileSync(join(dir, 'config.json'), '{ 이건 JSON 이 아님');
    const cfg = loadConfig(dir);
    expect(cfg.apiUrl).toBe(DEFAULT_API_URL);
  });

  it('키 배열이 아닌 값이 들어 있으면 빈 배열로 바로잡는다', () => {
    writeFileSync(join(dir, 'config.json'), JSON.stringify({ keys: 'ak_wrong' }));
    expect(loadConfig(dir).keys).toEqual([]);
  });
});

describe('saveConfig', () => {
  it('저장한 뒤 다시 읽으면 같은 값이 나온다', () => {
    saveConfig({ apiUrl: 'https://x.example', keys: [{ label: 'a', key: 'ak_1' }], lastProjectId: 7 }, dir);
    const cfg = loadConfig(dir);
    expect(cfg.lastProjectId).toBe(7);
    expect(cfg.keys).toHaveLength(1);
  });

  it('디렉토리가 없으면 만든다', () => {
    const nested = join(dir, 'a', 'b');
    saveConfig({ apiUrl: 'https://x.example', keys: [], lastProjectId: null }, nested);
    expect(JSON.parse(readFileSync(join(nested, 'config.json'), 'utf8')).apiUrl).toBe('https://x.example');
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `cd herdr-plugin; npx vitest run test/config.test.js`
Expected: FAIL — `Cannot find module '../src/config.js'`

- [ ] **Step 3: 구현**

```js
// herdr-plugin/src/config.js
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir, platform } from 'node:os';

export const DEFAULT_API_URL = 'https://kanban.yooit.kr';
const PLUGIN_ID = 'herdr-kanban';
const FILE_NAME = 'config.json';

const EMPTY = { apiUrl: DEFAULT_API_URL, keys: [], lastProjectId: null };

/** Herdr 플러그인 설정 디렉토리. HERDR_PLUGIN_CONFIG_DIR 이 있으면 그것을 쓴다. */
export function configDir() {
  const fromEnv = process.env.HERDR_PLUGIN_CONFIG_DIR;
  if (fromEnv) return fromEnv;

  const base = platform() === 'win32'
    ? join(process.env.APPDATA ?? join(homedir(), 'AppData', 'Roaming'), 'herdr')
    : join(homedir(), '.config', 'herdr');

  return join(base, 'plugins', 'config', PLUGIN_ID);
}

/** 설정을 읽는다. 파일이 없거나 깨졌으면 기본값을 돌려준다. */
export function loadConfig(dir = configDir()) {
  let raw;
  try {
    raw = readFileSync(join(dir, FILE_NAME), 'utf8');
  } catch {
    return { ...EMPTY };
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ...EMPTY };
  }

  return {
    apiUrl: typeof parsed.apiUrl === 'string' && parsed.apiUrl ? parsed.apiUrl : DEFAULT_API_URL,
    keys: Array.isArray(parsed.keys) ? parsed.keys.filter(isValidKey) : [],
    lastProjectId: Number.isInteger(parsed.lastProjectId) ? parsed.lastProjectId : null,
  };
}

/** 설정을 저장한다. 디렉토리가 없으면 만든다. */
export function saveConfig(cfg, dir = configDir()) {
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, FILE_NAME), JSON.stringify(cfg, null, 2), 'utf8');
}

function isValidKey(k) {
  return k && typeof k.label === 'string' && typeof k.key === 'string';
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `cd herdr-plugin; npx vitest run test/config.test.js`
Expected: PASS (6개)

- [ ] **Step 5: 커밋**

```bash
git add herdr-plugin/src/config.js herdr-plugin/test/config.test.js
git commit -m "feat(herdr-plugin): 설정 로드·저장"
```

---

### Task 4: API 클라이언트

**Files:**
- Create: `herdr-plugin/src/api/client.js`
- Test: `herdr-plugin/test/api-client.test.js`

**Interfaces:**
- Consumes: `config.js` 의 `apiUrl`
- Produces: `createClient({ apiUrl, apiKey, fetchImpl? })` 가 아래 메서드를 가진 객체를 돌려준다.
  - `listProjects() -> Promise<Project[]>`
  - `listStatuses(projectId) -> Promise<Status[]>`
  - `listTodos(projectId) -> Promise<Todo[]>`
  - `getTodo(id) -> Promise<Todo>`
  - `createTodo(projectId, { summary, description, priority, dueDate }) -> Promise<Todo>`
  - `updateTodo(id, patch) -> Promise<Todo>`
  - `changeStatus(id, statusKey) -> Promise<Todo>`
  - `deleteTodo(id) -> Promise<void>`
  - `listSubtasks(id) -> Promise<Todo[]>`
  - `createSubtask(parentId, body) -> Promise<Todo>`
  - `listComments(id) -> Promise<Comment[]>`
  - `addComment(id, content) -> Promise<Comment>`
- 오류는 `ApiError` 로 던진다. `ApiError` 는 `status`, `code`, `message` 를 가진다.
  - `code` 는 `'unauthorized' | 'not_found' | 'network' | 'server' | 'unknown'`

- [ ] **Step 1: 실패하는 테스트 작성**

```js
// herdr-plugin/test/api-client.test.js
import { describe, it, expect, vi } from 'vitest';
import { createClient, ApiError } from '../src/api/client.js';

const ok = (body) => ({ ok: true, status: 200, json: async () => body, text: async () => '' });
const fail = (status, body = '') => ({ ok: false, status, json: async () => ({}), text: async () => body });

function clientWith(fetchImpl) {
  return createClient({ apiUrl: 'https://k.example', apiKey: 'ak_test', fetchImpl });
}

describe('요청 구성', () => {
  it('Bearer 헤더를 붙인다', async () => {
    const f = vi.fn().mockResolvedValue(ok([]));
    await clientWith(f).listProjects();
    const [, init] = f.mock.calls[0];
    expect(init.headers.Authorization).toBe('Bearer ak_test');
  });

  it('projectId 를 질의 문자열로 넘긴다', async () => {
    const f = vi.fn().mockResolvedValue(ok([]));
    await clientWith(f).listTodos(3);
    expect(f.mock.calls[0][0]).toBe('https://k.example/api/todos?projectId=3');
  });

  it('생성은 POST 로 보내고 본문을 JSON 으로 직렬화한다', async () => {
    const f = vi.fn().mockResolvedValue(ok({ id: 1 }));
    await clientWith(f).createTodo(3, { summary: '테스트', priority: 'HIGH' });
    const [url, init] = f.mock.calls[0];
    expect(url).toBe('https://k.example/api/todos');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toMatchObject({ summary: '테스트', priority: 'HIGH', projectId: 3 });
  });

  it('상태 변경은 statusKey 를 담아 PUT 한다', async () => {
    const f = vi.fn().mockResolvedValue(ok({ id: 1 }));
    await clientWith(f).changeStatus(1, 'IN_PROGRESS');
    const [url, init] = f.mock.calls[0];
    expect(url).toBe('https://k.example/api/todos/1/status');
    expect(init.method).toBe('PUT');
    expect(JSON.parse(init.body)).toEqual({ statusKey: 'IN_PROGRESS' });
  });
});

describe('오류 처리', () => {
  it('401 은 unauthorized 로 분류한다', async () => {
    const f = vi.fn().mockResolvedValue(fail(401));
    await expect(clientWith(f).listProjects()).rejects.toMatchObject({ code: 'unauthorized', status: 401 });
  });

  it('404 는 not_found 로 분류한다', async () => {
    const f = vi.fn().mockResolvedValue(fail(404));
    await expect(clientWith(f).getTodo(9)).rejects.toMatchObject({ code: 'not_found' });
  });

  it('500 은 server 로 분류한다', async () => {
    const f = vi.fn().mockResolvedValue(fail(500));
    await expect(clientWith(f).listProjects()).rejects.toMatchObject({ code: 'server' });
  });

  it('연결 실패는 network 로 분류한다', async () => {
    const f = vi.fn().mockRejectedValue(new TypeError('fetch failed'));
    await expect(clientWith(f).listProjects()).rejects.toMatchObject({ code: 'network' });
  });

  it('ApiError 는 Error 를 상속한다', async () => {
    const f = vi.fn().mockResolvedValue(fail(401));
    await expect(clientWith(f).listProjects()).rejects.toBeInstanceOf(ApiError);
  });
});

describe('응답 처리', () => {
  it('DELETE 는 본문을 읽지 않는다', async () => {
    const json = vi.fn();
    const f = vi.fn().mockResolvedValue({ ok: true, status: 204, json, text: async () => '' });
    await clientWith(f).deleteTodo(1);
    expect(json).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `cd herdr-plugin; npx vitest run test/api-client.test.js`
Expected: FAIL — 모듈 없음

- [ ] **Step 3: 구현**

```js
// herdr-plugin/src/api/client.js

export class ApiError extends Error {
  constructor(code, status, message) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}

const MESSAGES = {
  unauthorized: 'API Key 가 올바르지 않습니다. 설정을 확인해 주십시오.',
  not_found: '요청한 항목을 찾을 수 없습니다.',
  network: '서버에 연결하지 못했습니다. 주소와 네트워크를 확인해 주십시오.',
  server: '서버에서 오류가 발생했습니다.',
  unknown: '알 수 없는 오류가 발생했습니다.',
};

function classify(status) {
  if (status === 401 || status === 403) return 'unauthorized';
  if (status === 404) return 'not_found';
  if (status >= 500) return 'server';
  return 'unknown';
}

export function createClient({ apiUrl, apiKey, fetchImpl = globalThis.fetch }) {
  const base = apiUrl.replace(/\/+$/, '');

  async function request(path, { method = 'GET', body, parse = true } = {}) {
    const init = {
      method,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    };
    if (body !== undefined) init.body = JSON.stringify(body);

    let res;
    try {
      res = await fetchImpl(`${base}${path}`, init);
    } catch (cause) {
      throw new ApiError('network', 0, MESSAGES.network, { cause });
    }

    if (!res.ok) {
      const code = classify(res.status);
      throw new ApiError(code, res.status, MESSAGES[code]);
    }

    if (!parse) return undefined;
    return res.json();
  }

  const q = (projectId) => (projectId == null ? '' : `?projectId=${projectId}`);

  return {
    listProjects: () => request('/api/projects'),
    listStatuses: (projectId) => request(`/api/statuses${q(projectId)}`),
    listTodos: (projectId) => request(`/api/todos${q(projectId)}`),
    getTodo: (id) => request(`/api/todos/${id}`),

    createTodo: (projectId, fields) =>
      request('/api/todos', { method: 'POST', body: { ...fields, projectId } }),
    updateTodo: (id, patch) =>
      request(`/api/todos/${id}`, { method: 'PUT', body: patch }),
    changeStatus: (id, statusKey) =>
      request(`/api/todos/${id}/status`, { method: 'PUT', body: { statusKey } }),
    deleteTodo: (id) =>
      request(`/api/todos/${id}`, { method: 'DELETE', parse: false }),

    listSubtasks: (id) => request(`/api/todos/${id}/subtasks`),
    createSubtask: (parentId, fields) =>
      request(`/api/todos/${parentId}/subtasks`, { method: 'POST', body: fields }),

    listComments: (id) => request(`/api/todos/${id}/comments`),
    addComment: (id, content) =>
      request(`/api/todos/${id}/comments`, { method: 'POST', body: { content } }),
  };
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `cd herdr-plugin; npx vitest run test/api-client.test.js`
Expected: PASS (10개)

- [ ] **Step 5: 실제 서버로 한 번 확인**

발급받은 키로 실제 호출이 되는지 본다. 모킹만으로는 필드 이름 오류를 잡지 못한다.

```bash
node -e "
import('./herdr-plugin/src/api/client.js').then(async (m) => {
  const c = m.createClient({ apiUrl: 'https://kanban.yooit.kr', apiKey: process.env.KANBAN_KEY });
  const ps = await c.listProjects();
  console.log('프로젝트', ps.length, '건:', ps.map(p => p.name).join(', '));
  const ss = await c.listStatuses(ps[0].id);
  console.log('칸:', ss.map(s => s.name + '(' + s.statusKey + ')').join(' | '));
});
"
```

Expected: 프로젝트 목록과 칸 구성이 출력된다.
필드 이름이 다르면 `공통 타입` 절과 이후 태스크의 참조를 실제에 맞게 고친다.

- [ ] **Step 6: 커밋**

```bash
git add herdr-plugin/src/api/client.js herdr-plugin/test/api-client.test.js
git commit -m "feat(herdr-plugin): REST API 클라이언트"
```

---

### Task 5: 레이아웃 계산기

이 파일이 렌더링과 마우스 판정의 단일 출처다. 가장 틀리기 쉬운 곳이므로
테스트를 두껍게 쓴다.

**Files:**
- Create: `herdr-plugin/src/layout.js`
- Test: `herdr-plugin/test/layout.test.js`

**Interfaces:**
- Consumes: 없음 (순수 함수)
- Produces:
  - `computeLayout({ columns, rows, statuses, cardsByStatus, scroll, collapsed, columnOffset }) -> { mode, regions, detailX, visibleColumns }`
    - `mode` 는 `'board-detail' | 'board' | 'list'`
    - `regions` 는 `{ kind, id, x, y, w, h }` 배열
    - `kind` 는 `'card' | 'column-header' | 'project-name'`
  - `CARD_HEIGHT = 5`, `COLUMN_GAP = 2`, `MIN_COLUMN_WIDTH = 14`, `DETAIL_WIDTH = 40`
  - `pickMode(columns) -> 'board-detail' | 'board' | 'list'`

- [ ] **Step 1: 실패하는 테스트 작성**

```js
// herdr-plugin/test/layout.test.js
import { describe, it, expect } from 'vitest';
import { computeLayout, pickMode, CARD_HEIGHT, DETAIL_WIDTH } from '../src/layout.js';

const statuses = [
  { statusKey: 'TODO', name: '할 일', color: '#2563EB', position: 0 },
  { statusKey: 'IN_PROGRESS', name: '진행 중', color: '#D97706', position: 1 },
  { statusKey: 'DONE', name: '완료', color: '#059669', position: 2 },
];

const cards = {
  TODO: [{ id: 1, summary: 'a' }, { id: 2, summary: 'b' }],
  IN_PROGRESS: [{ id: 3, summary: 'c' }],
  DONE: [],
};

const base = {
  columns: 214, rows: 48, statuses, cardsByStatus: cards,
  scroll: {}, collapsed: {}, columnOffset: 0,
};

describe('pickMode', () => {
  it('140열 이상이면 보드와 상세를 함께 보여준다', () => {
    expect(pickMode(214)).toBe('board-detail');
    expect(pickMode(140)).toBe('board-detail');
  });
  it('90에서 139열은 보드만 보여준다', () => {
    expect(pickMode(139)).toBe('board');
    expect(pickMode(90)).toBe('board');
  });
  it('90열 미만은 목록 모드다', () => {
    expect(pickMode(89)).toBe('list');
  });
});

describe('computeLayout — 보드+상세', () => {
  it('상세 패널 자리를 남긴다', () => {
    const l = computeLayout(base);
    expect(l.mode).toBe('board-detail');
    expect(l.detailX).toBe(214 - DETAIL_WIDTH);
  });

  it('카드 영역이 상세 패널을 침범하지 않는다', () => {
    const l = computeLayout(base);
    for (const r of l.regions.filter(r => r.kind === 'card')) {
      expect(r.x + r.w).toBeLessThanOrEqual(l.detailX);
    }
  });

  it('모든 카드에 영역을 만든다', () => {
    const ids = computeLayout(base).regions.filter(r => r.kind === 'card').map(r => r.id);
    expect(ids.sort()).toEqual([1, 2, 3]);
  });

  it('같은 칸의 카드는 CARD_HEIGHT 간격으로 쌓인다', () => {
    const [a, b] = computeLayout(base).regions.filter(r => r.kind === 'card' && [1, 2].includes(r.id));
    expect(b.y - a.y).toBe(CARD_HEIGHT);
    expect(a.x).toBe(b.x);
  });

  it('칸마다 머리 영역을 만든다', () => {
    const heads = computeLayout(base).regions.filter(r => r.kind === 'column-header');
    expect(heads.map(h => h.id)).toEqual(['TODO', 'IN_PROGRESS', 'DONE']);
  });

  it('영역이 서로 겹치지 않는다', () => {
    const rs = computeLayout(base).regions;
    for (let i = 0; i < rs.length; i++) {
      for (let j = i + 1; j < rs.length; j++) {
        expect(overlaps(rs[i], rs[j])).toBe(false);
      }
    }
  });
});

describe('computeLayout — 스크롤과 접힘', () => {
  it('스크롤한 만큼 카드가 위로 올라간다', () => {
    const l = computeLayout({ ...base, scroll: { TODO: 1 } });
    const first = l.regions.find(r => r.kind === 'card' && r.id === 2);
    const head = l.regions.find(r => r.kind === 'column-header' && r.id === 'TODO');
    expect(first.y).toBe(head.y + 1);
  });

  it('스크롤로 화면 밖에 나간 카드는 영역을 만들지 않는다', () => {
    const l = computeLayout({ ...base, scroll: { TODO: 1 } });
    expect(l.regions.some(r => r.kind === 'card' && r.id === 1)).toBe(false);
  });

  it('접힌 칸은 머리만 남기고 카드 영역을 만들지 않는다', () => {
    const l = computeLayout({ ...base, collapsed: { TODO: true } });
    expect(l.regions.some(r => r.kind === 'card' && [1, 2].includes(r.id))).toBe(false);
    expect(l.regions.some(r => r.kind === 'column-header' && r.id === 'TODO')).toBe(true);
  });
});

describe('computeLayout — 좁은 화면', () => {
  it('폭이 모자라면 보이는 칸 수를 줄인다', () => {
    const l = computeLayout({ ...base, columns: 100 });
    expect(l.visibleColumns.length).toBeLessThan(3);
    expect(l.mode).toBe('board');
  });

  it('columnOffset 만큼 오른쪽 칸부터 보여준다', () => {
    const l = computeLayout({ ...base, columns: 100, columnOffset: 1 });
    expect(l.visibleColumns[0]).toBe('IN_PROGRESS');
  });

  it('목록 모드에서는 모든 카드가 같은 x 에 놓인다', () => {
    const l = computeLayout({ ...base, columns: 80 });
    expect(l.mode).toBe('list');
    const xs = new Set(l.regions.filter(r => r.kind === 'card').map(r => r.x));
    expect(xs.size).toBe(1);
  });
});

describe('computeLayout — 경계', () => {
  it('카드가 하나도 없어도 예외를 던지지 않는다', () => {
    const empty = { TODO: [], IN_PROGRESS: [], DONE: [] };
    expect(() => computeLayout({ ...base, cardsByStatus: empty })).not.toThrow();
  });

  it('칸이 하나도 없어도 예외를 던지지 않는다', () => {
    expect(() => computeLayout({ ...base, statuses: [], cardsByStatus: {} })).not.toThrow();
  });

  it('행이 매우 적으면 카드를 하나도 배치하지 않을 수 있다', () => {
    const l = computeLayout({ ...base, rows: 5 });
    expect(l.regions.filter(r => r.kind === 'card').length).toBeLessThanOrEqual(1);
  });
});

function overlaps(a, b) {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `cd herdr-plugin; npx vitest run test/layout.test.js`
Expected: FAIL — 모듈 없음

- [ ] **Step 3: 구현**

```js
// herdr-plugin/src/layout.js

export const CARD_HEIGHT = 5;
export const COLUMN_GAP = 2;
export const MIN_COLUMN_WIDTH = 14;
export const MAX_COLUMN_WIDTH = 28;
export const DETAIL_WIDTH = 40;

const HEADER_ROWS = 2;   // 상단 제목줄 + 구분선
const FOOTER_ROWS = 1;   // 하단 키 안내
const COLUMN_HEAD_ROWS = 1;

/** pane 폭으로 표시 모드를 정한다. */
export function pickMode(columns) {
  if (columns >= 140) return 'board-detail';
  if (columns >= 90) return 'board';
  return 'list';
}

/**
 * 화면 배치를 계산한다. 이 결과가 렌더링과 마우스 판정의 단일 출처다.
 * 반환하는 좌표는 pane 좌상단을 (0, 0) 으로 하는 셀 단위다.
 */
export function computeLayout({
  columns, rows, statuses, cardsByStatus,
  scroll = {}, collapsed = {}, columnOffset = 0,
}) {
  const mode = pickMode(columns);
  const detailX = mode === 'board-detail' ? columns - DETAIL_WIDTH : columns;
  const boardWidth = detailX;
  const bodyTop = HEADER_ROWS;
  const bodyHeight = Math.max(0, rows - HEADER_ROWS - FOOTER_ROWS);

  const regions = [{ kind: 'project-name', id: 'project', x: 1, y: 0, w: 24, h: 1 }];

  if (mode === 'list') {
    return { mode, detailX, visibleColumns: statuses.map(s => s.statusKey),
             regions: [...regions, ...listRegions({ statuses, cardsByStatus, bodyTop, bodyHeight, boardWidth })] };
  }

  const { visibleColumns, columnWidth } = fitColumns({ statuses, boardWidth, columnOffset });

  visibleColumns.forEach((statusKey, i) => {
    const x = i * (columnWidth + COLUMN_GAP);
    regions.push({ kind: 'column-header', id: statusKey, x, y: bodyTop, w: columnWidth, h: COLUMN_HEAD_ROWS });

    if (collapsed[statusKey]) return;

    const cardTop = bodyTop + COLUMN_HEAD_ROWS;
    const room = bodyHeight - COLUMN_HEAD_ROWS;
    const skipped = scroll[statusKey] ?? 0;
    const cards = (cardsByStatus[statusKey] ?? []).slice(skipped);

    cards.forEach((card, n) => {
      const y = cardTop + n * CARD_HEIGHT;
      if (y + CARD_HEIGHT > bodyTop + bodyHeight) return;      // 아래로 넘치면 버린다
      if (room < CARD_HEIGHT) return;                          // 애초에 자리가 없다
      regions.push({ kind: 'card', id: card.id, x, y, w: columnWidth, h: CARD_HEIGHT });
    });
  });

  return { mode, detailX, visibleColumns, regions };
}

/** 보드 폭에 몇 개의 칸이 들어가는지, 칸 하나의 폭은 얼마인지 정한다. */
function fitColumns({ statuses, boardWidth, columnOffset }) {
  if (statuses.length === 0) return { visibleColumns: [], columnWidth: MIN_COLUMN_WIDTH };

  const perColumn = MIN_COLUMN_WIDTH + COLUMN_GAP;
  const fits = Math.max(1, Math.floor((boardWidth + COLUMN_GAP) / perColumn));
  const rest = statuses.slice(columnOffset);
  const shown = rest.slice(0, Math.min(fits, rest.length));

  const width = shown.length === 0
    ? MIN_COLUMN_WIDTH
    : Math.min(
        MAX_COLUMN_WIDTH,
        Math.floor((boardWidth - COLUMN_GAP * (shown.length - 1)) / shown.length),
      );

  return { visibleColumns: shown.map(s => s.statusKey), columnWidth: Math.max(MIN_COLUMN_WIDTH, width) };
}

/** 목록 모드 — 칸을 나누지 않고 한 줄에 하나씩 쌓는다. */
function listRegions({ statuses, cardsByStatus, bodyTop, bodyHeight, boardWidth }) {
  const out = [];
  let y = bodyTop;

  for (const s of statuses) {
    for (const card of cardsByStatus[s.statusKey] ?? []) {
      if (y >= bodyTop + bodyHeight) return out;
      out.push({ kind: 'card', id: card.id, x: 0, y, w: boardWidth, h: 1 });
      y += 1;
    }
  }
  return out;
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `cd herdr-plugin; npx vitest run test/layout.test.js`
Expected: PASS (16개)

겹침 테스트가 실패하면 `COLUMN_GAP` 이 폭 계산에 제대로 반영되었는지 본다.
이 테스트가 좌표 버그를 잡는 핵심이므로 통과할 때까지 구현을 고친다.

- [ ] **Step 5: 커밋**

```bash
git add herdr-plugin/src/layout.js herdr-plugin/test/layout.test.js
git commit -m "feat(herdr-plugin): 레이아웃 좌표 계산기"
```

---

### Task 6: 히트 판정

**Files:**
- Create: `herdr-plugin/src/input/hit.js`
- Test: `herdr-plugin/test/hit.test.js`

**Interfaces:**
- Consumes: `layout.js` 의 `regions` 배열
- Produces:
  - `hitTest(regions, x, y) -> region | null`
  - `columnAt(layout, x) -> statusKey | null`

- [ ] **Step 1: 실패하는 테스트 작성**

```js
// herdr-plugin/test/hit.test.js
import { describe, it, expect } from 'vitest';
import { hitTest, columnAt } from '../src/input/hit.js';

const regions = [
  { kind: 'card', id: 1, x: 0, y: 3, w: 16, h: 5 },
  { kind: 'card', id: 2, x: 0, y: 8, w: 16, h: 5 },
  { kind: 'column-header', id: 'TODO', x: 0, y: 2, w: 16, h: 1 },
  { kind: 'card', id: 3, x: 18, y: 3, w: 16, h: 5 },
];

describe('hitTest', () => {
  it('영역 안의 좌표는 그 영역을 돌려준다', () => {
    expect(hitTest(regions, 5, 5)).toMatchObject({ kind: 'card', id: 1 });
  });

  it('왼쪽 위 모서리는 포함한다', () => {
    expect(hitTest(regions, 0, 3)).toMatchObject({ id: 1 });
  });

  it('오른쪽 아래 경계는 포함하지 않는다', () => {
    expect(hitTest(regions, 16, 3)).toBeNull();
    expect(hitTest(regions, 0, 8)).toMatchObject({ id: 2 });  // y=8 은 카드2의 시작
  });

  it('빈 곳은 null 을 돌려준다', () => {
    expect(hitTest(regions, 17, 5)).toBeNull();
    expect(hitTest(regions, 5, 40)).toBeNull();
  });

  it('칸 머리도 판정한다', () => {
    expect(hitTest(regions, 3, 2)).toMatchObject({ kind: 'column-header', id: 'TODO' });
  });

  it('영역이 없으면 null 이다', () => {
    expect(hitTest([], 0, 0)).toBeNull();
  });
});

describe('columnAt', () => {
  const layout = {
    mode: 'board',
    visibleColumns: ['TODO', 'IN_PROGRESS'],
    regions: [
      { kind: 'column-header', id: 'TODO', x: 0, y: 2, w: 16, h: 1 },
      { kind: 'column-header', id: 'IN_PROGRESS', x: 18, y: 2, w: 16, h: 1 },
    ],
  };

  it('칸의 x 범위 안이면 그 칸을 돌려준다 (세로 위치는 보지 않는다)', () => {
    expect(columnAt(layout, 5)).toBe('TODO');
    expect(columnAt(layout, 20)).toBe('IN_PROGRESS');
  });

  it('칸 사이 여백은 null 이다', () => {
    expect(columnAt(layout, 17)).toBeNull();
  });

  it('보드 오른쪽 바깥은 null 이다', () => {
    expect(columnAt(layout, 200)).toBeNull();
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `cd herdr-plugin; npx vitest run test/hit.test.js`
Expected: FAIL — 모듈 없음

- [ ] **Step 3: 구현**

```js
// herdr-plugin/src/input/hit.js

/**
 * 좌표에 놓인 영역을 찾는다. 오른쪽·아래 경계는 포함하지 않는다.
 * 나중에 추가된 영역이 위에 있다고 보고 뒤에서부터 찾는다.
 */
export function hitTest(regions, x, y) {
  for (let i = regions.length - 1; i >= 0; i--) {
    const r = regions[i];
    if (x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) return r;
  }
  return null;
}

/**
 * x 좌표가 어느 칸에 속하는지 본다. 드래그로 카드를 떨어뜨릴 칸을 정할 때 쓴다.
 * 카드가 없는 빈 칸에도 떨어뜨릴 수 있어야 하므로 칸 머리의 x 범위만 본다.
 */
export function columnAt(layout, x) {
  for (const r of layout.regions) {
    if (r.kind !== 'column-header') continue;
    if (x >= r.x && x < r.x + r.w) return r.id;
  }
  return null;
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `cd herdr-plugin; npx vitest run test/hit.test.js`
Expected: PASS (9개)

- [ ] **Step 5: 커밋**

```bash
git add herdr-plugin/src/input/hit.js herdr-plugin/test/hit.test.js
git commit -m "feat(herdr-plugin): 좌표 히트 판정"
```

---

## Phase 2 — 읽기 화면

이 단계가 끝나면 칸반 보드가 pane 에 그려지고 키보드로 돌아다니며 상세를 볼 수 있다.

### Task 7: 상태 저장소

**Files:**
- Create: `herdr-plugin/src/store.js`
- Test: `herdr-plugin/test/store.test.js`

**Interfaces:**
- Consumes: `api/client.js` 의 클라이언트 객체
- Produces:
  - `createStore({ client, initialProjectId }) -> store`
  - store 의 상태: `{ projects, projectId, statuses, cardsByStatus, selected, focus, scroll, collapsed, columnOffset, loading, error, filter }`
    - `selected` 는 `{ statusKey, cardId } | null`
    - `focus` 는 `'board' | 'detail'`
    - `filter` 는 `{ query: string, priority: string|null }`
  - store 의 메서드:
    - `getState() -> state`
    - `subscribe(fn) -> unsubscribe`
    - `loadProjects() -> Promise<void>`
    - `loadBoard(projectId) -> Promise<void>`
    - `moveSelection(dy) -> void`
    - `moveColumn(dx) -> void`
    - `selectCard(statusKey, cardId) -> void`
    - `setFilter(patch) -> void`
    - `visibleCards(statusKey) -> Todo[]` (필터 적용 결과)
    - `toggleCollapse(statusKey) -> void`
    - `scrollColumn(statusKey, delta) -> void`
    - `setFocus('board'|'detail') -> void`
    - `setError(message|null) -> void`
    - `upsertCard(card) -> void` — 카드 하나를 갈아 끼운다. 칸이 바뀌면 옮긴다
    - `removeCard(cardId) -> void`
    - `replaceBoard(cardsByStatus) -> void`

  뒤의 여섯 개는 Task 11 의 SSE 갱신과 Task 12 의 낙관적 갱신이 쓴다.

- [ ] **Step 1: 실패하는 테스트 작성**

```js
// herdr-plugin/test/store.test.js
import { describe, it, expect, vi } from 'vitest';
import { createStore } from '../src/store.js';

const statuses = [
  { statusKey: 'TODO', name: '할 일', position: 0 },
  { statusKey: 'DONE', name: '완료', position: 1 },
];

const todos = [
  { id: 1, summary: '첫째', statusKey: 'TODO', priority: 'HIGH' },
  { id: 2, summary: '둘째', statusKey: 'TODO', priority: 'LOW' },
  { id: 3, summary: '셋째', statusKey: 'DONE', priority: 'MEDIUM' },
];

function fakeClient(over = {}) {
  return {
    listProjects: vi.fn().mockResolvedValue([{ id: 3, name: 'MBRIS' }]),
    listStatuses: vi.fn().mockResolvedValue(statuses),
    listTodos: vi.fn().mockResolvedValue(todos),
    ...over,
  };
}

describe('보드 적재', () => {
  it('카드를 statusKey 별로 나눈다', async () => {
    const s = createStore({ client: fakeClient() });
    await s.loadBoard(3);
    expect(s.getState().cardsByStatus.TODO.map(c => c.id)).toEqual([1, 2]);
    expect(s.getState().cardsByStatus.DONE.map(c => c.id)).toEqual([3]);
  });

  it('카드가 없는 칸도 빈 배열을 갖는다', async () => {
    const s = createStore({ client: fakeClient({ listTodos: vi.fn().mockResolvedValue([]) }) });
    await s.loadBoard(3);
    expect(s.getState().cardsByStatus.TODO).toEqual([]);
  });

  it('적재 중에는 loading 이 true 다', async () => {
    let seen = false;
    const s = createStore({ client: fakeClient() });
    s.subscribe(() => { if (s.getState().loading) seen = true; });
    await s.loadBoard(3);
    expect(seen).toBe(true);
    expect(s.getState().loading).toBe(false);
  });

  it('실패하면 error 에 메시지를 담는다', async () => {
    const boom = Object.assign(new Error('x'), { code: 'network', message: '연결 실패' });
    const s = createStore({ client: fakeClient({ listTodos: vi.fn().mockRejectedValue(boom) }) });
    await s.loadBoard(3);
    expect(s.getState().error).toBe('연결 실패');
    expect(s.getState().loading).toBe(false);
  });

  it('적재 후 첫 카드를 선택한다', async () => {
    const s = createStore({ client: fakeClient() });
    await s.loadBoard(3);
    expect(s.getState().selected).toEqual({ statusKey: 'TODO', cardId: 1 });
  });
});

describe('선택 이동', () => {
  async function ready() {
    const s = createStore({ client: fakeClient() });
    await s.loadBoard(3);
    return s;
  }

  it('아래로 이동한다', async () => {
    const s = await ready();
    s.moveSelection(1);
    expect(s.getState().selected.cardId).toBe(2);
  });

  it('마지막 카드에서 아래로 가도 그대로다', async () => {
    const s = await ready();
    s.moveSelection(1); s.moveSelection(1);
    expect(s.getState().selected.cardId).toBe(2);
  });

  it('첫 카드에서 위로 가도 그대로다', async () => {
    const s = await ready();
    s.moveSelection(-1);
    expect(s.getState().selected.cardId).toBe(1);
  });

  it('옆 칸으로 이동하면 그 칸의 첫 카드를 고른다', async () => {
    const s = await ready();
    s.moveColumn(1);
    expect(s.getState().selected).toEqual({ statusKey: 'DONE', cardId: 3 });
  });

  it('빈 칸으로 이동하면 카드 없이 칸만 선택한다', async () => {
    const s = createStore({ client: fakeClient({ listTodos: vi.fn().mockResolvedValue([todos[0]]) }) });
    await s.loadBoard(3);
    s.moveColumn(1);
    expect(s.getState().selected).toEqual({ statusKey: 'DONE', cardId: null });
  });

  it('오른쪽 끝에서 더 가도 그대로다', async () => {
    const s = await ready();
    s.moveColumn(1); s.moveColumn(1);
    expect(s.getState().selected.statusKey).toBe('DONE');
  });
});

describe('필터', () => {
  async function ready() {
    const s = createStore({ client: fakeClient() });
    await s.loadBoard(3);
    return s;
  }

  it('제목 검색은 대소문자를 가리지 않는다', async () => {
    const s = await ready();
    s.setFilter({ query: '첫' });
    expect(s.visibleCards('TODO').map(c => c.id)).toEqual([1]);
  });

  it('우선순위로 거른다', async () => {
    const s = await ready();
    s.setFilter({ priority: 'LOW' });
    expect(s.visibleCards('TODO').map(c => c.id)).toEqual([2]);
  });

  it('필터를 비우면 모두 보인다', async () => {
    const s = await ready();
    s.setFilter({ query: '첫' });
    s.setFilter({ query: '' });
    expect(s.visibleCards('TODO')).toHaveLength(2);
  });
});

describe('구독', () => {
  it('상태가 바뀌면 구독자를 부른다', async () => {
    const s = createStore({ client: fakeClient() });
    const fn = vi.fn();
    s.subscribe(fn);
    await s.loadBoard(3);
    expect(fn).toHaveBeenCalled();
  });

  it('구독을 해제하면 더 부르지 않는다', async () => {
    const s = createStore({ client: fakeClient() });
    const fn = vi.fn();
    s.subscribe(fn)();
    await s.loadBoard(3);
    expect(fn).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `cd herdr-plugin; npx vitest run test/store.test.js`
Expected: FAIL — 모듈 없음

- [ ] **Step 3: 구현**

```js
// herdr-plugin/src/store.js

const INITIAL = {
  projects: [],
  projectId: null,
  statuses: [],
  cardsByStatus: {},
  selected: null,
  focus: 'board',
  scroll: {},
  collapsed: {},
  columnOffset: 0,
  loading: false,
  error: null,
  filter: { query: '', priority: null },
};

export function createStore({ client, initialProjectId = null }) {
  let state = { ...INITIAL, projectId: initialProjectId };
  const listeners = new Set();

  const notify = () => { for (const fn of listeners) fn(state); };
  const set = (patch) => { state = { ...state, ...patch }; notify(); };

  function groupByStatus(statuses, todos) {
    const out = {};
    for (const s of statuses) out[s.statusKey] = [];
    for (const t of todos) {
      const key = t.statusKey ?? t.status;
      (out[key] ??= []).push(t);
    }
    return out;
  }

  function matches(card, filter) {
    if (filter.query && !card.summary.toLowerCase().includes(filter.query.toLowerCase())) return false;
    if (filter.priority && card.priority !== filter.priority) return false;
    return true;
  }

  const visibleCards = (statusKey) =>
    (state.cardsByStatus[statusKey] ?? []).filter(c => matches(c, state.filter));

  function firstCardOf(statusKey) {
    const list = visibleCards(statusKey);
    return list.length > 0 ? list[0].id : null;
  }

  return {
    getState: () => state,

    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },

    visibleCards,

    async loadProjects() {
      try {
        set({ projects: await client.listProjects() });
      } catch (e) {
        set({ error: e.message });
      }
    },

    async loadBoard(projectId) {
      set({ loading: true, error: null, projectId });
      try {
        const [statuses, todos] = await Promise.all([
          client.listStatuses(projectId),
          client.listTodos(projectId),
        ]);
        const active = statuses.filter(s => s.active !== false)
                               .sort((a, b) => a.position - b.position);
        const cardsByStatus = groupByStatus(active, todos);
        const firstKey = active[0]?.statusKey ?? null;
        const firstId = firstKey ? (cardsByStatus[firstKey][0]?.id ?? null) : null;

        set({
          statuses: active,
          cardsByStatus,
          selected: firstKey ? { statusKey: firstKey, cardId: firstId } : null,
          loading: false,
        });
      } catch (e) {
        set({ loading: false, error: e.message });
      }
    },

    selectCard(statusKey, cardId) {
      set({ selected: { statusKey, cardId } });
    },

    moveSelection(dy) {
      const sel = state.selected;
      if (!sel) return;
      const list = visibleCards(sel.statusKey);
      if (list.length === 0) return;

      const at = list.findIndex(c => c.id === sel.cardId);
      const next = Math.min(list.length - 1, Math.max(0, (at === -1 ? 0 : at) + dy));
      set({ selected: { statusKey: sel.statusKey, cardId: list[next].id } });
    },

    moveColumn(dx) {
      const sel = state.selected;
      if (!sel || state.statuses.length === 0) return;

      const at = state.statuses.findIndex(s => s.statusKey === sel.statusKey);
      const next = Math.min(state.statuses.length - 1, Math.max(0, at + dx));
      const key = state.statuses[next].statusKey;
      set({ selected: { statusKey: key, cardId: firstCardOf(key) } });
    },

    setFilter(patch) {
      set({ filter: { ...state.filter, ...patch } });
    },

    toggleCollapse(statusKey) {
      set({ collapsed: { ...state.collapsed, [statusKey]: !state.collapsed[statusKey] } });
    },

    scrollColumn(statusKey, delta) {
      const max = Math.max(0, visibleCards(statusKey).length - 1);
      const now = state.scroll[statusKey] ?? 0;
      set({ scroll: { ...state.scroll, [statusKey]: Math.min(max, Math.max(0, now + delta)) } });
    },

    setFocus(focus) { set({ focus }); },
    setError(error) { set({ error }); },

    /** 서버에서 받은 카드 하나를 반영한다. SSE 와 낙관적 갱신이 함께 쓴다. */
    upsertCard(card) {
      const key = card.statusKey ?? card.status;
      const next = {};
      for (const [k, list] of Object.entries(state.cardsByStatus)) {
        next[k] = list.filter(c => c.id !== card.id);
      }
      (next[key] ??= []).push(card);
      set({ cardsByStatus: next });
    },

    removeCard(cardId) {
      const next = {};
      for (const [k, list] of Object.entries(state.cardsByStatus)) {
        next[k] = list.filter(c => c.id !== cardId);
      }
      set({ cardsByStatus: next });
    },

    replaceBoard(cardsByStatus) { set({ cardsByStatus }); },
  };
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `cd herdr-plugin; npx vitest run test/store.test.js`
Expected: PASS (15개)

- [ ] **Step 5: 커밋**

```bash
git add herdr-plugin/src/store.js herdr-plugin/test/store.test.js
git commit -m "feat(herdr-plugin): 상태 저장소"
```

---

### Task 8: 보드 렌더링

`layout.js` 가 계산한 좌표대로 그린다. Ink 의 Flexbox 에 맡기지 않고
`position="absolute"` 로 좌표를 직접 지정해 계산 결과와 화면을 일치시킨다.

**Files:**
- Create: `herdr-plugin/src/ui/Card.jsx`
- Create: `herdr-plugin/src/ui/Board.jsx`
- Create: `herdr-plugin/src/ui/Chrome.jsx`
- Test: `herdr-plugin/test/ui-board.test.jsx`
- Modify: `herdr-plugin/package.json` (JSX 처리를 위한 esbuild 설정 추가)

**Interfaces:**
- Consumes: `layout.js` 의 `computeLayout`, `store.js` 의 상태
- Produces:
  - `<Board layout statuses cardsByStatus selected dragging dropTarget />`
  - `<Card card width selected dimmed />` — 높이 5행, 보드 모드용
  - `<CardRow card width selected statusColor />` — 높이 1행, 목록 모드용
  - `<Chrome projectName connected error>{children}</Chrome>` — 상단 제목줄과 하단 키 안내

**중요:** `layout.js` 는 목록 모드에서 카드 영역의 높이를 1로 계산한다(`listRegions`).
따라서 `Board` 는 `layout.mode` 를 보고 5행짜리 `Card` 와 1행짜리 `CardRow` 를 갈라
써야 한다. 이 둘이 어긋나면 눌리는 곳과 보이는 곳이 달라진다.

- [ ] **Step 1: JSX 처리 설정**

vitest 는 esbuild 로 JSX 를 변환한다. `vitest.config.js` 에 다음을 더한다.

```js
// herdr-plugin/vitest.config.js
export default {
  esbuild: { jsx: 'automatic' },
  test: {
    include: ['test/**/*.test.{js,jsx}'],
    coverage: { provider: 'v8', reporter: ['text', 'json-summary'] },
  },
};
```

런타임에서도 JSX 가 필요하므로 `package.json` 에 빌드 스크립트를 더한다.

```json
"scripts": {
  "build": "esbuild src/cli.jsx --bundle --platform=node --format=esm --packages=external --outfile=dist/cli.js",
  "start": "node dist/cli.js",
  "test": "vitest run"
}
```

devDependencies 에 `"esbuild": "^0.24.0"` 을 더한다.
`herdr-plugin.toml` 의 `[[build]]` 를 `["npm", "ci"]` 다음 `["npm", "run", "build"]` 두 단계로 바꾸고,
`[[panes]]` 의 실행 경로를 `src\cli.js` 에서 `dist\cli.js` 로 바꾼다.

Run: `cd herdr-plugin; npm install esbuild --save-dev`

- [ ] **Step 2: 실패하는 테스트 작성**

```jsx
// herdr-plugin/test/ui-board.test.jsx
import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import { Board } from '../src/ui/Board.jsx';
import { computeLayout } from '../src/layout.js';

const statuses = [
  { statusKey: 'TODO', name: '할 일', color: '#2563EB', position: 0 },
  { statusKey: 'DONE', name: '완료', color: '#059669', position: 1 },
];

const cardsByStatus = {
  TODO: [{ id: 1, summary: '첫 번째 일감', priority: 'HIGH', dueDate: '2026-09-05', subtaskTotal: 3, subtaskDone: 1 }],
  DONE: [],
};

function frame(over = {}) {
  const layout = computeLayout({
    columns: 160, rows: 24, statuses, cardsByStatus,
    scroll: {}, collapsed: {}, columnOffset: 0, ...over,
  });
  return render(
    <Board layout={layout} statuses={statuses} cardsByStatus={cardsByStatus}
           selected={{ statusKey: 'TODO', cardId: 1 }} />
  ).lastFrame();
}

describe('Board', () => {
  it('칸 이름과 카드 수를 보여준다', () => {
    const f = frame();
    expect(f).toContain('할 일');
    expect(f).toContain('완료');
  });

  it('카드 제목을 보여준다', () => {
    expect(frame()).toContain('첫 번째 일감');
  });

  it('일감 번호를 보여준다', () => {
    expect(frame()).toContain('#1');
  });

  it('하위 일감 진행도를 보여준다', () => {
    expect(frame()).toContain('1/3');
  });

  it('마감일을 보여준다', () => {
    expect(frame()).toContain('09-05');
  });

  it('카드가 없는 칸도 머리를 보여준다', () => {
    expect(frame()).toContain('완료');
  });

  it('접힌 칸은 카드를 그리지 않는다', () => {
    expect(frame({ collapsed: { TODO: true } })).not.toContain('첫 번째 일감');
  });

  it('긴 제목은 칸 폭에 맞춰 자른다', () => {
    const long = { TODO: [{ id: 1, summary: '가'.repeat(200), priority: 'LOW' }], DONE: [] };
    const layout = computeLayout({ columns: 160, rows: 24, statuses, cardsByStatus: long });
    const f = render(<Board layout={layout} statuses={statuses} cardsByStatus={long} selected={null} />).lastFrame();
    for (const line of f.split('\n')) expect(line.length).toBeLessThanOrEqual(160);
  });
});

describe('Board — 목록 모드', () => {
  const listLayout = () => computeLayout({
    columns: 80, rows: 24, statuses, cardsByStatus, scroll: {}, collapsed: {}, columnOffset: 0,
  });

  it('목록 모드로 계산된다', () => {
    expect(listLayout().mode).toBe('list');
  });

  it('카드 한 건이 한 줄만 차지한다', () => {
    const layout = listLayout();
    const f = render(<Board layout={layout} statuses={statuses}
                            cardsByStatus={cardsByStatus} selected={null} />).lastFrame();
    const hits = f.split('\n').filter(l => l.includes('첫 번째 일감'));
    expect(hits).toHaveLength(1);
  });

  it('그려진 줄 수가 레이아웃이 예상한 높이를 넘지 않는다', () => {
    const layout = listLayout();
    const cardRegions = layout.regions.filter(r => r.kind === 'card');
    const f = render(<Board layout={layout} statuses={statuses}
                            cardsByStatus={cardsByStatus} selected={null} />).lastFrame();
    // 카드 영역 높이의 합이 실제 렌더 줄 수보다 작으면 좌표와 화면이 어긋난 것이다
    const drawn = f.split('\n').filter(l => l.includes('첫 번째 일감')).length;
    expect(drawn).toBeLessThanOrEqual(cardRegions.reduce((n, r) => n + r.h, 0));
  });
});
```

- [ ] **Step 3: 테스트 실패 확인**

Run: `cd herdr-plugin; npx vitest run test/ui-board.test.jsx`
Expected: FAIL — 모듈 없음

- [ ] **Step 4: Card 구현**

```jsx
// herdr-plugin/src/ui/Card.jsx
import { Box, Text } from 'ink';

const PRIORITY_LABEL = { HIGH: '높음', MEDIUM: '보통', LOW: '낮음' };
const PRIORITY_COLOR = { HIGH: 'red', MEDIUM: 'yellow', LOW: 'gray' };

/** 여러 줄로 접는다. 터미널 폭을 넘지 않도록 자른다. */
function wrap(text, width, maxLines) {
  const out = [];
  let rest = text ?? '';
  while (rest.length > 0 && out.length < maxLines) {
    out.push(rest.slice(0, width));
    rest = rest.slice(width);
  }
  if (rest.length > 0 && out.length > 0) {
    out[out.length - 1] = out[out.length - 1].slice(0, Math.max(0, width - 1)) + '…';
  }
  return out;
}

export function Card({ card, width, selected = false, dimmed = false }) {
  const inner = Math.max(1, width - 4);
  const title = wrap(card.summary, inner, 2);

  const meta = [];
  if (card.dueDate) meta.push(card.completedAt ? `v${card.dueDate.slice(5)}` : `~${card.dueDate.slice(5)}`);
  if (card.subtaskTotal > 0) meta.push(`${card.subtaskDone ?? 0}/${card.subtaskTotal}`);
  if (card.hasActiveDiscussion) meta.push('*');

  return (
    <Box flexDirection="column" width={width} height={5}
         borderStyle={selected ? 'bold' : 'round'}
         borderColor={selected ? 'cyan' : 'gray'}
         paddingX={1}>
      <Text dimColor={dimmed}>
        <Text color="gray">#{card.id}</Text>
        {'  '}
        <Text color={PRIORITY_COLOR[card.priority] ?? 'gray'}>
          {PRIORITY_LABEL[card.priority] ?? ''}
        </Text>
      </Text>
      {title.map((line, i) => <Text key={i} dimColor={dimmed}>{line}</Text>)}
      <Text color="gray" dimColor={dimmed}>{meta.join('  ')}</Text>
    </Box>
  );
}

/**
 * 목록 모드용 한 줄짜리 카드.
 * layout.js 의 listRegions 가 높이를 1로 잡으므로 절대 두 줄이 되면 안 된다.
 */
export function CardRow({ card, width, selected = false, statusColor }) {
  const idText = `#${card.id}`;
  const metaText = card.dueDate ? ` ~${card.dueDate.slice(5)}` : '';
  const room = Math.max(1, width - idText.length - metaText.length - 4);

  return (
    <Box width={width}>
      <Text color={statusColor}>{selected ? '▌' : ' '}</Text>
      <Text color="gray">{idText} </Text>
      <Text bold={selected}>{card.summary.slice(0, room)}</Text>
      <Text color="gray">{metaText}</Text>
    </Box>
  );
}
```

- [ ] **Step 5: Board 구현**

```jsx
// herdr-plugin/src/ui/Board.jsx
import { Box, Text } from 'ink';
import { Card, CardRow } from './Card.jsx';

export function Board({ layout, statuses, cardsByStatus, selected,
                        dragging = null, dropTarget = null }) {
  const byKey = Object.fromEntries(statuses.map(s => [s.statusKey, s]));

  // 카드 id 로 카드와 그 칸을 함께 찾을 수 있도록 미리 모아 둔다
  const cardById = new Map();
  for (const [statusKey, list] of Object.entries(cardsByStatus)) {
    for (const c of list) cardById.set(c.id, { card: c, statusKey });
  }

  const isList = layout.mode === 'list';

  return (
    <Box flexDirection="column" flexGrow={1}>
      {layout.regions.map((r, i) => {
        if (r.kind === 'column-header') {
          const s = byKey[r.id];
          if (!s) return null;
          const count = (cardsByStatus[r.id] ?? []).length;
          const isTarget = dropTarget === r.id;
          return (
            <Box key={`h-${i}`} position="absolute" marginLeft={r.x} marginTop={r.y} width={r.w}>
              <Text bold color={isTarget ? 'cyan' : s.color} inverse={isTarget}>
                {isTarget ? `▸ ${s.name} ◂` : s.name}
              </Text>
              <Text color="gray"> {count}</Text>
            </Box>
          );
        }

        if (r.kind === 'card') {
          const found = cardById.get(r.id);
          if (!found) return null;
          const { card, statusKey } = found;
          const chosen = selected?.cardId === card.id;

          // 목록 모드는 영역 높이가 1이므로 한 줄짜리로 그린다.
          // 여기서 갈라 쓰지 않으면 좌표와 화면이 어긋난다.
          return (
            <Box key={`c-${i}`} position="absolute" marginLeft={r.x} marginTop={r.y}>
              {isList
                ? <CardRow card={card} width={r.w} selected={chosen}
                           statusColor={byKey[statusKey]?.color} />
                : <Card card={card} width={r.w} selected={chosen}
                        dimmed={dragging === card.id} />}
            </Box>
          );
        }

        return null;
      })}
    </Box>
  );
}
```

- [ ] **Step 6: Chrome 구현**

```jsx
// herdr-plugin/src/ui/Chrome.jsx
import { Box, Text } from 'ink';

const HINT = 'j/k 이동  h/l 칸  Enter 상세  n 새 일감  Space 상태변경  p 프로젝트  ? 도움말  q 종료';

export function Chrome({ projectName, connected, error, children }) {
  return (
    <Box flexDirection="column" flexGrow={1}>
      <Box>
        <Text bold color="cyan">ysk-kanban</Text>
        <Text>  </Text>
        <Text bold>{projectName ?? '(프로젝트 없음)'}</Text>
        <Box flexGrow={1} />
        <Text color={connected ? 'green' : 'yellow'}>
          {connected ? '실시간' : '주기 갱신'}
        </Text>
      </Box>

      <Box flexGrow={1}>{children}</Box>

      {error
        ? <Text color="red">{error}</Text>
        : <Text color="gray">{HINT}</Text>}
    </Box>
  );
}
```

- [ ] **Step 7: 테스트 통과 확인**

Run: `cd herdr-plugin; npx vitest run test/ui-board.test.jsx`
Expected: PASS (8개)

`position="absolute"` 가 기대대로 동작하지 않으면 Ink 문서를 확인하고
대안으로 각 칸을 `<Box flexDirection="row">` 안의 세로 스택으로 배치하되,
`layout.js` 의 좌표를 그대로 `marginLeft`/`marginTop` 에 반영해
계산과 화면이 어긋나지 않게 유지한다.

- [ ] **Step 8: 커밋**

```bash
git add herdr-plugin/src/ui/ herdr-plugin/test/ui-board.test.jsx herdr-plugin/vitest.config.js herdr-plugin/package.json
git commit -m "feat(herdr-plugin): 보드 렌더링"
```

---

### Task 9: 앱 조립과 키보드 탐색

여기서 처음으로 실제 화면이 뜬다.

**Files:**
- Create: `herdr-plugin/src/ui/App.jsx`
- Create: `herdr-plugin/src/input/keys.js`
- Rename: `herdr-plugin/src/cli.js` -> `herdr-plugin/src/cli.jsx`
- Test: `herdr-plugin/test/keys.test.js`

**Interfaces:**
- Consumes: `store.js`, `layout.js`, `ui/Board.jsx`, `ui/Chrome.jsx`
- Produces:
  - `resolveKey(input, key) -> action | null` — 순수 함수. `action` 은 `{ type, ... }`
    - 타입: `move-up`, `move-down`, `move-left`, `move-right`, `column-first`, `column-last`,
      `open-detail`, `toggle-focus`, `refresh`, `help`, `quit`, `search`, `filter`,
      `project`, `new`, `subtask`, `edit`, `edit-description`, `change-status`,
      `move-status-left`, `move-status-right`, `comment`, `delete`, `toggle-mouse`
  - `<App client store />`

- [ ] **Step 1: 키 해석 테스트 작성**

```js
// herdr-plugin/test/keys.test.js
import { describe, it, expect } from 'vitest';
import { resolveKey } from '../src/input/keys.js';

const NONE = {};

describe('이동 키', () => {
  it('j 와 아래 화살표는 같은 뜻이다', () => {
    expect(resolveKey('j', NONE)).toEqual({ type: 'move-down' });
    expect(resolveKey('', { downArrow: true })).toEqual({ type: 'move-down' });
  });

  it('k 와 위 화살표는 같은 뜻이다', () => {
    expect(resolveKey('k', NONE)).toEqual({ type: 'move-up' });
    expect(resolveKey('', { upArrow: true })).toEqual({ type: 'move-up' });
  });

  it('h/l 은 칸 이동이다', () => {
    expect(resolveKey('h', NONE)).toEqual({ type: 'move-left' });
    expect(resolveKey('l', NONE)).toEqual({ type: 'move-right' });
  });

  it('g/G 는 칸의 처음과 끝이다', () => {
    expect(resolveKey('g', NONE)).toEqual({ type: 'column-first' });
    expect(resolveKey('G', NONE)).toEqual({ type: 'column-last' });
  });
});

describe('대소문자 구분', () => {
  it('H/L 은 카드를 옆 칸으로 옮긴다', () => {
    expect(resolveKey('H', NONE)).toEqual({ type: 'move-status-left' });
    expect(resolveKey('L', NONE)).toEqual({ type: 'move-status-right' });
  });

  it('e 는 폼 수정, E 는 에디터 수정이다', () => {
    expect(resolveKey('e', NONE)).toEqual({ type: 'edit' });
    expect(resolveKey('E', NONE)).toEqual({ type: 'edit-description' });
  });
});

describe('특수 키', () => {
  it('Enter 는 상세를 연다', () => {
    expect(resolveKey('', { return: true })).toEqual({ type: 'open-detail' });
  });

  it('Tab 은 포커스를 옮긴다', () => {
    expect(resolveKey('', { tab: true })).toEqual({ type: 'toggle-focus' });
  });

  it('Space 는 상태 변경이다', () => {
    expect(resolveKey(' ', NONE)).toEqual({ type: 'change-status' });
  });
});

describe('안전장치', () => {
  it('Ctrl 조합은 무시한다', () => {
    expect(resolveKey('c', { ctrl: true })).toBeNull();
    expect(resolveKey('n', { ctrl: true })).toBeNull();
  });

  it('메타 조합은 무시한다', () => {
    expect(resolveKey('q', { meta: true })).toBeNull();
  });

  it('모르는 키는 null 이다', () => {
    expect(resolveKey('Z', NONE)).toBeNull();
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `cd herdr-plugin; npx vitest run test/keys.test.js`
Expected: FAIL — 모듈 없음

- [ ] **Step 3: 키 해석 구현**

```js
// herdr-plugin/src/input/keys.js

const BY_CHAR = {
  j: 'move-down',   k: 'move-up',
  h: 'move-left',   l: 'move-right',
  g: 'column-first', G: 'column-last',
  H: 'move-status-left', L: 'move-status-right',
  n: 'new',  s: 'subtask',
  e: 'edit', E: 'edit-description',
  c: 'comment', x: 'delete',
  p: 'project', r: 'refresh',
  m: 'toggle-mouse', '?': 'help', q: 'quit',
  '/': 'search', f: 'filter',
  ' ': 'change-status',
};

/**
 * 키 입력을 동작으로 바꾼다. 순수 함수이므로 테스트하기 쉽다.
 * Ctrl·Meta 조합은 터미널과 Herdr 가 쓰므로 가로채지 않는다.
 */
export function resolveKey(input, key) {
  if (key.ctrl || key.meta || key.super || key.hyper) return null;

  if (key.downArrow) return { type: 'move-down' };
  if (key.upArrow) return { type: 'move-up' };
  if (key.leftArrow) return { type: 'move-left' };
  if (key.rightArrow) return { type: 'move-right' };
  if (key.return) return { type: 'open-detail' };
  if (key.tab) return { type: 'toggle-focus' };
  if (key.escape) return { type: 'close-modal' };

  const type = BY_CHAR[input];
  return type ? { type } : null;
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `cd herdr-plugin; npx vitest run test/keys.test.js`
Expected: PASS (12개)

- [ ] **Step 5: App 조립**

```jsx
// herdr-plugin/src/ui/App.jsx
import { useEffect, useState, useSyncExternalStore } from 'react';
import { Box, Text, useApp, useInput, useWindowSize } from 'ink';
import { computeLayout } from '../layout.js';
import { resolveKey } from '../input/keys.js';
import { Board } from './Board.jsx';
import { Chrome } from './Chrome.jsx';

export function App({ store }) {
  const { exit } = useApp();
  const { columns, rows } = useWindowSize();
  const state = useSyncExternalStore(store.subscribe, store.getState);
  const [connected] = useState(false);

  useEffect(() => { store.loadProjects(); }, [store]);

  useInput((input, key) => {
    const action = resolveKey(input, key);
    if (!action) return;

    switch (action.type) {
      case 'move-down':  return store.moveSelection(1);
      case 'move-up':    return store.moveSelection(-1);
      case 'move-left':  return store.moveColumn(-1);
      case 'move-right': return store.moveColumn(1);
      case 'refresh':    return void store.loadBoard(state.projectId);
      case 'quit':       return exit();
      default:           return;   // 나머지는 이후 태스크에서 붙인다
    }
  });

  if (state.loading && state.statuses.length === 0) {
    return <Text color="gray">불러오는 중…</Text>;
  }

  const layout = computeLayout({
    columns, rows,
    statuses: state.statuses,
    cardsByStatus: state.cardsByStatus,
    scroll: state.scroll,
    collapsed: state.collapsed,
    columnOffset: state.columnOffset,
  });

  const projectName = state.projects.find(p => p.id === state.projectId)?.name;

  return (
    <Chrome projectName={projectName} connected={connected} error={state.error}>
      <Board layout={layout} statuses={state.statuses}
             cardsByStatus={state.cardsByStatus} selected={state.selected} />
    </Chrome>
  );
}
```

- [ ] **Step 6: 진입점 교체**

`src/cli.js` 를 지우고 `src/cli.jsx` 를 만든다.

```jsx
#!/usr/bin/env node
// herdr-plugin/src/cli.jsx
import { render, Text } from 'ink';
import { loadConfig } from './config.js';
import { createClient } from './api/client.js';
import { createStore } from './store.js';
import { App } from './ui/App.jsx';

const cfg = loadConfig();

if (cfg.keys.length === 0) {
  render(
    <Text color="yellow">
      {'API Key 가 설정되지 않았습니다.\n'}
      {'kanban.yooit.kr 에서 키를 발급받은 뒤 설정 파일에 넣어 주십시오.\n'}
      {'설정 경로는 herdr plugin config-dir herdr-kanban 으로 확인할 수 있습니다.'}
    </Text>
  );
  process.exitCode = 1;
} else {
  const client = createClient({ apiUrl: cfg.apiUrl, apiKey: cfg.keys[0].key });
  const store = createStore({ client, initialProjectId: cfg.lastProjectId });

  await store.loadProjects();
  const projectId = cfg.lastProjectId ?? store.getState().projects[0]?.id;
  if (projectId) await store.loadBoard(projectId);

  render(<App store={store} />, { alternateScreen: true, exitOnCtrlC: true });
}
```

- [ ] **Step 7: 실제 화면 확인**

Run: `cd herdr-plugin; npm run build`
Run: `herdr plugin pane open --plugin herdr-kanban --entrypoint board --placement split --no-focus`
Run: `herdr pane read <pane_id> --source recent-unwrapped --lines 40`

Expected: 칸 이름과 카드가 그려진다.
사용자에게 `j`/`k`/`h`/`l` 을 눌러 선택이 움직이는지 확인해 달라고 요청한다.

- [ ] **Step 8: 커밋**

```bash
git add herdr-plugin/src/ herdr-plugin/test/keys.test.js
git rm herdr-plugin/src/cli.js
git commit -m "feat(herdr-plugin): 앱 조립과 키보드 탐색"
```

---

### Task 10: 상세 패널

**Files:**
- Create: `herdr-plugin/src/ui/Detail.jsx`
- Modify: `herdr-plugin/src/ui/App.jsx` (상세 패널 연결)
- Test: `herdr-plugin/test/ui-detail.test.jsx`

**Interfaces:**
- Consumes: `api/client.js` 의 `getTodo`, `listSubtasks`, `listComments`
- Produces: `<Detail card subtasks comments width loading />`

- [ ] **Step 1: 실패하는 테스트 작성**

```jsx
// herdr-plugin/test/ui-detail.test.jsx
import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import { Detail } from '../src/ui/Detail.jsx';

const card = {
  id: 1902, summary: '커스텀 SQL 배치 등록 오류 수정',
  description: '배치 등록 시 파라미터가 누락되는 문제',
  statusKey: 'IN_PROGRESS', priority: 'HIGH', dueDate: '2026-09-05',
  assignees: [{ id: 1, username: 'ysk' }],
};

const subtasks = [
  { id: 1903, summary: '스키마 정의', statusKey: 'DONE' },
  { id: 1904, summary: '배치 등록 처리', statusKey: 'TODO' },
];

const comments = [{ id: 1, content: '재현 확인함', author: { username: 'ysk' }, createdAt: '2026-09-01T10:00:00' }];

const frame = (over = {}) => render(
  <Detail card={card} subtasks={subtasks} comments={comments}
          statusName="진행 중" width={40} loading={false} {...over} />
).lastFrame();

describe('Detail', () => {
  it('일감 번호와 제목을 보여준다', () => {
    const f = frame();
    expect(f).toContain('#1902');
    expect(f).toContain('커스텀 SQL');
  });

  it('상태 이름을 보여준다', () => {
    expect(frame()).toContain('진행 중');
  });

  it('담당자를 보여준다', () => {
    expect(frame()).toContain('ysk');
  });

  it('하위 일감의 완료 여부를 표시한다', () => {
    const f = frame();
    expect(f).toContain('스키마 정의');
    expect(f).toContain('배치 등록 처리');
  });

  it('댓글 내용을 보여준다', () => {
    expect(frame()).toContain('재현 확인함');
  });

  it('카드가 없으면 안내 문구를 보여준다', () => {
    expect(frame({ card: null })).toContain('선택된 일감이 없습니다');
  });

  it('불러오는 중에는 안내를 보여준다', () => {
    expect(frame({ loading: true })).toContain('불러오는 중');
  });

  it('폭을 넘지 않는다', () => {
    for (const line of frame().split('\n')) expect(line.length).toBeLessThanOrEqual(40);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `cd herdr-plugin; npx vitest run test/ui-detail.test.jsx`
Expected: FAIL — 모듈 없음

- [ ] **Step 3: 구현**

```jsx
// herdr-plugin/src/ui/Detail.jsx
import { Box, Text } from 'ink';

const PRIORITY_LABEL = { HIGH: '높음', MEDIUM: '보통', LOW: '낮음' };

function Row({ label, value }) {
  return (
    <Box>
      <Box width={7}><Text color="gray">{label}</Text></Box>
      <Text>{value}</Text>
    </Box>
  );
}

function clip(text, width, maxLines) {
  const lines = [];
  for (const para of (text ?? '').split('\n')) {
    let rest = para;
    do {
      lines.push(rest.slice(0, width));
      rest = rest.slice(width);
    } while (rest.length > 0 && lines.length < maxLines);
    if (lines.length >= maxLines) break;
  }
  return lines.slice(0, maxLines);
}

export function Detail({ card, subtasks = [], comments = [], statusName, width, loading }) {
  if (!card) {
    return <Box width={width}><Text color="gray">선택된 일감이 없습니다</Text></Box>;
  }

  const inner = Math.max(10, width - 2);

  return (
    <Box flexDirection="column" width={width} paddingX={1}>
      <Text color="gray">#{card.id}</Text>
      {clip(card.summary, inner, 3).map((l, i) => <Text key={i} bold>{l}</Text>)}

      {loading && <Text color="gray">불러오는 중…</Text>}

      <Text color="gray">{'─'.repeat(inner)}</Text>
      <Row label="상태" value={statusName ?? card.statusKey} />
      <Row label="우선" value={PRIORITY_LABEL[card.priority] ?? '-'} />
      <Row label="마감" value={card.dueDate ?? '-'} />
      <Row label="담당" value={(card.assignees ?? []).map(a => a.username).join(', ') || '-'} />

      {card.description && (
        <>
          <Text color="gray">{'─'.repeat(inner)}</Text>
          {clip(card.description, inner, 6).map((l, i) => <Text key={i}>{l}</Text>)}
        </>
      )}

      {subtasks.length > 0 && (
        <>
          <Text color="gray">{'─'.repeat(inner)}</Text>
          <Text color="gray">
            하위 {subtasks.filter(s => s.statusKey === 'DONE').length}/{subtasks.length}
          </Text>
          {subtasks.slice(0, 6).map(s => (
            <Text key={s.id}>
              <Text color={s.statusKey === 'DONE' ? 'green' : 'gray'}>
                {s.statusKey === 'DONE' ? ' v ' : ' o '}
              </Text>
              {s.summary.slice(0, inner - 3)}
            </Text>
          ))}
        </>
      )}

      {comments.length > 0 && (
        <>
          <Text color="gray">{'─'.repeat(inner)}</Text>
          <Text color="gray">댓글 {comments.length}</Text>
          {comments.slice(-3).map(c => (
            <Text key={c.id}>{clip(c.content, inner, 1)[0]}</Text>
          ))}
        </>
      )}
    </Box>
  );
}
```

- [ ] **Step 4: App 에 연결**

`App.jsx` 에서 선택이 바뀌면 상세를 불러오고, `board-detail` 모드일 때 오른쪽에 그린다.

```jsx
// App.jsx 에 추가
const [detail, setDetail] = useState({ card: null, subtasks: [], comments: [], loading: false });

useEffect(() => {
  const id = state.selected?.cardId;
  if (!id) { setDetail({ card: null, subtasks: [], comments: [], loading: false }); return; }

  let alive = true;
  setDetail(d => ({ ...d, loading: true }));

  Promise.all([client.getTodo(id), client.listSubtasks(id), client.listComments(id)])
    .then(([card, subtasks, comments]) => {
      if (alive) setDetail({ card, subtasks, comments, loading: false });
    })
    .catch(e => { if (alive) { store.setError(e.message); setDetail(d => ({ ...d, loading: false })); } });

  return () => { alive = false; };
}, [state.selected?.cardId, client, store]);
```

렌더 부분에서 `layout.mode === 'board-detail'` 이면 `<Detail>` 을 곁들인다.
`App` 은 `client` 를 props 로 받도록 시그니처를 `App({ store, client })` 로 바꾸고,
`cli.jsx` 에서 `<App store={store} client={client} />` 로 넘긴다.

- [ ] **Step 5: 테스트 통과 확인**

Run: `cd herdr-plugin; npx vitest run`
Expected: 전체 PASS

- [ ] **Step 6: 커밋**

```bash
git add herdr-plugin/src/ui/Detail.jsx herdr-plugin/src/ui/App.jsx herdr-plugin/src/cli.jsx herdr-plugin/test/ui-detail.test.jsx
git commit -m "feat(herdr-plugin): 상세 패널"
```

---

### Task 11: 실시간 갱신

**Files:**
- Create: `herdr-plugin/src/api/sse.js`
- Modify: `herdr-plugin/src/ui/App.jsx`
- Test: `herdr-plugin/test/sse.test.js`

**Interfaces:**
- Consumes: `store.js` 의 `loadBoard`
- Produces:
  - `watchBoard({ apiUrl, apiKey, projectId, onChange, onStatus, fetchImpl?, pollMs? }) -> stop()`
    - `onStatus('live' | 'polling')` 으로 연결 상태를 알린다
    - SSE 가 끊기면 자동으로 폴링으로 강등한다
  - `parseFrames(buffer) -> { frames: [{ event, data }], rest: string }` — 순수 함수

**백엔드 실제 사양 (확인 완료, 추측 아님)**

`SseController` 와 `TodoController` 를 직접 읽어 확인한 내용이다.

| 항목 | 실제 값 |
|---|---|
| 경로 | `GET /api/sse/subscribe` — **질의 파라미터를 받지 않는다** |
| 인증 | `ApiKeyAuthFilter` 가 `Authorization: Bearer ak_...` 를 처리하므로 헤더 인증이 된다 |
| 연결 직후 | `event: connected` / `data: ok` |
| 하트비트 | `: heartbeat` (주석 줄) |
| 일감 변경 | `event: todo_changed` / `data: {"action":"created\|updated\|deleted","projectId":3}` |
| 댓글 변경 | `event: comment_changed` / `data: {"action":"...","todoId":1902}` |

**따라서 URL 에 `?projectId=` 를 붙이면 안 된다.** 서버가 무시하며,
모든 프로젝트의 이벤트가 한 스트림으로 들어온다. 현재 보고 있는 프로젝트만
갱신하려면 **페이로드의 `projectId` 로 걸러야 한다.** 이 필터가 없으면 다른
프로젝트를 건드릴 때마다 화면이 불필요하게 다시 그려진다.

브라우저는 `EventSource` 를 쓰지만 그것은 헤더를 붙일 수 없다.
API Key 인증이 필요하므로 여기서는 `fetch` 로 스트림을 직접 읽는다.

- [ ] **Step 1: 실패하는 테스트 작성**

```js
// herdr-plugin/test/sse.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { watchBoard, parseFrames } from '../src/api/sse.js';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('watchBoard', () => {
  it('SSE 연결에 성공하면 live 를 알린다', async () => {
    const onStatus = vi.fn();
    const body = new ReadableStream({ start(c) { c.enqueue(new TextEncoder().encode(': ok\n\n')); } });
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, status: 200, body });

    const stop = watchBoard({ apiUrl: 'https://k.example', apiKey: 'ak_1', projectId: 3,
                              onChange: vi.fn(), onStatus, fetchImpl });
    await vi.advanceTimersByTimeAsync(0);
    expect(onStatus).toHaveBeenCalledWith('live');
    stop();
  });

  it('SSE 연결에 실패하면 polling 으로 강등한다', async () => {
    const onStatus = vi.fn();
    const fetchImpl = vi.fn().mockRejectedValue(new Error('연결 실패'));

    const stop = watchBoard({ apiUrl: 'https://k.example', apiKey: 'ak_1', projectId: 3,
                              onChange: vi.fn(), onStatus, fetchImpl, pollMs: 1000 });
    await vi.advanceTimersByTimeAsync(0);
    expect(onStatus).toHaveBeenCalledWith('polling');
    stop();
  });

  it('폴링 모드에서 주기마다 onChange 를 부른다', async () => {
    const onChange = vi.fn();
    const fetchImpl = vi.fn().mockRejectedValue(new Error('연결 실패'));

    const stop = watchBoard({ apiUrl: 'https://k.example', apiKey: 'ak_1', projectId: 3,
                              onChange, onStatus: vi.fn(), fetchImpl, pollMs: 1000 });
    await vi.advanceTimersByTimeAsync(2500);
    expect(onChange.mock.calls.length).toBeGreaterThanOrEqual(2);
    stop();
  });

  it('stop 을 부르면 더 이상 갱신하지 않는다', async () => {
    const onChange = vi.fn();
    const fetchImpl = vi.fn().mockRejectedValue(new Error('연결 실패'));

    const stop = watchBoard({ apiUrl: 'https://k.example', apiKey: 'ak_1', projectId: 3,
                              onChange, onStatus: vi.fn(), fetchImpl, pollMs: 1000 });
    await vi.advanceTimersByTimeAsync(1500);
    const before = onChange.mock.calls.length;
    stop();
    await vi.advanceTimersByTimeAsync(5000);
    expect(onChange.mock.calls.length).toBe(before);
  });

  it('URL 에 projectId 를 붙이지 않는다 (서버가 받지 않음)', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error('연결 실패'));
    const stop = watchBoard({ apiUrl: 'https://k.example', apiKey: 'ak_1', projectId: 3,
                              onChange: vi.fn(), onStatus: vi.fn(), fetchImpl, pollMs: 1000 });
    await vi.advanceTimersByTimeAsync(0);
    expect(fetchImpl.mock.calls[0][0]).toBe('https://k.example/api/sse/subscribe');
    stop();
  });

  it('Bearer 헤더와 event-stream Accept 를 보낸다', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error('연결 실패'));
    const stop = watchBoard({ apiUrl: 'https://k.example', apiKey: 'ak_1', projectId: 3,
                              onChange: vi.fn(), onStatus: vi.fn(), fetchImpl, pollMs: 1000 });
    await vi.advanceTimersByTimeAsync(0);
    const init = fetchImpl.mock.calls[0][1];
    expect(init.headers.Authorization).toBe('Bearer ak_1');
    expect(init.headers.Accept).toBe('text/event-stream');
    stop();
  });
});

describe('parseFrames', () => {
  it('완성된 프레임을 떼어낸다', () => {
    const { frames } = parseFrames('event: todo_changed\ndata: {"projectId":3}\n\n');
    expect(frames).toEqual([{ event: 'todo_changed', data: '{"projectId":3}' }]);
  });

  it('덜 온 조각은 rest 로 남긴다', () => {
    const { frames, rest } = parseFrames('event: a\ndata: 1\n\nevent: b\ndata: 2');
    expect(frames).toHaveLength(1);
    expect(rest).toBe('event: b\ndata: 2');
  });

  it('하트비트 주석은 프레임을 만들지 않는다', () => {
    expect(parseFrames(': heartbeat\n\n').frames).toEqual([]);
  });

  it('여러 프레임을 한 번에 처리한다', () => {
    const { frames } = parseFrames('event: a\ndata: 1\n\nevent: b\ndata: 2\n\n');
    expect(frames.map(f => f.event)).toEqual(['a', 'b']);
  });

  it('event 줄이 없으면 message 로 본다', () => {
    expect(parseFrames('data: 1\n\n').frames[0].event).toBe('message');
  });
});

describe('프로젝트 필터', () => {
  /** 주어진 프레임들을 한 덩어리로 흘려보내는 가짜 스트림 */
  function streamOf(text) {
    return new ReadableStream({
      start(c) { c.enqueue(new TextEncoder().encode(text)); },
    });
  }

  async function runWith(text, projectId = 3) {
    const onChange = vi.fn();
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, status: 200, body: streamOf(text) });
    const stop = watchBoard({ apiUrl: 'https://k.example', apiKey: 'ak_1', projectId,
                              onChange, onStatus: vi.fn(), fetchImpl });
    await vi.advanceTimersByTimeAsync(10);
    stop();
    return onChange;
  }

  it('같은 프로젝트의 todo_changed 는 갱신한다', async () => {
    const onChange = await runWith('event: todo_changed\ndata: {"action":"updated","projectId":3}\n\n');
    expect(onChange).toHaveBeenCalled();
  });

  it('다른 프로젝트의 todo_changed 는 무시한다', async () => {
    const onChange = await runWith('event: todo_changed\ndata: {"action":"updated","projectId":99}\n\n');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('보드와 무관한 이벤트는 무시한다', async () => {
    const onChange = await runWith('event: notification\ndata: {"id":1}\n\n');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('comment_changed 는 프로젝트를 알 수 없으므로 갱신한다', async () => {
    const onChange = await runWith('event: comment_changed\ndata: {"todoId":1902}\n\n');
    expect(onChange).toHaveBeenCalled();
  });

  it('connected 이벤트만으로는 갱신하지 않는다', async () => {
    const onChange = await runWith('event: connected\ndata: ok\n\n');
    expect(onChange).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `cd herdr-plugin; npx vitest run test/sse.test.js`
Expected: FAIL — 모듈 없음

- [ ] **Step 3: 구현**

```js
// herdr-plugin/src/api/sse.js

/** 관심 있는 이벤트. 나머지(알림·토론)는 보드와 무관하므로 무시한다. */
const WATCHED = new Set(['todo_changed', 'comment_changed']);

/**
 * SSE 스트림 버퍼에서 완성된 프레임만 떼어낸다.
 * 마지막 조각은 아직 덜 온 것일 수 있으므로 rest 로 돌려준다.
 */
export function parseFrames(buffer) {
  const chunks = buffer.split('\n\n');
  const rest = chunks.pop() ?? '';
  const frames = [];

  for (const chunk of chunks) {
    let event = 'message';
    let data = '';

    for (const line of chunk.split('\n')) {
      if (line.startsWith(':')) continue;                       // 하트비트 주석
      if (line.startsWith('event:')) event = line.slice(6).trim();
      else if (line.startsWith('data:')) data += line.slice(5).trim();
    }

    if (data) frames.push({ event, data });
  }

  return { frames, rest };
}

/**
 * 보드 변경을 감시한다. SSE 를 먼저 시도하고, 실패하면 주기 폴링으로 내려간다.
 * 반환값을 부르면 감시를 멈춘다.
 *
 * 서버는 모든 프로젝트의 이벤트를 한 스트림으로 보내므로
 * 페이로드의 projectId 로 지금 보고 있는 프로젝트만 걸러낸다.
 */
export function watchBoard({
  apiUrl, apiKey, projectId, onChange, onStatus,
  fetchImpl = globalThis.fetch, pollMs = 30000,
}) {
  let stopped = false;
  let timer = null;
  let controller = null;

  const base = apiUrl.replace(/\/+$/, '');

  function startPolling() {
    if (stopped) return;
    onStatus('polling');
    timer = setInterval(() => { if (!stopped) onChange(); }, pollMs);
  }

  /** 이 프레임이 지금 보고 있는 보드와 관련 있는지 본다. */
  function concerns(frame) {
    if (!WATCHED.has(frame.event)) return false;
    if (frame.event === 'comment_changed') return true;   // todoId 만 오므로 그냥 갱신한다

    try {
      const payload = JSON.parse(frame.data);
      return payload.projectId === projectId;
    } catch {
      return true;    // 파싱에 실패하면 놓치는 것보다 갱신하는 편이 낫다
    }
  }

  async function startSse() {
    controller = new AbortController();
    let res;
    try {
      res = await fetchImpl(`${base}/api/sse/subscribe`, {
        headers: { Authorization: `Bearer ${apiKey}`, Accept: 'text/event-stream' },
        signal: controller.signal,
      });
    } catch {
      return startPolling();
    }

    if (stopped) return;
    if (!res.ok || !res.body) return startPolling();

    onStatus('live');
    try {
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (!stopped) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const { frames, rest } = parseFrames(buffer);
        buffer = rest;

        if (frames.some(concerns)) onChange();
      }
    } catch {
      // 스트림이 끊겼다
    }

    if (!stopped) startPolling();
  }

  startSse();

  return function stop() {
    stopped = true;
    if (timer) clearInterval(timer);
    controller?.abort();
  };
}
```

- [ ] **Step 4: App 에 연결**

```jsx
// App.jsx 에 추가
const [connected, setConnected] = useState(false);

useEffect(() => {
  if (!state.projectId) return;
  const stop = watchBoard({
    apiUrl: cfg.apiUrl, apiKey: cfg.keys[0].key, projectId: state.projectId,
    onChange: () => store.loadBoard(state.projectId),
    onStatus: (s) => setConnected(s === 'live'),
  });
  return stop;
}, [state.projectId]);
```

`cfg` 는 `cli.jsx` 에서 props 로 넘긴다.

- [ ] **Step 5: 테스트 통과 확인**

Run: `cd herdr-plugin; npx vitest run`
Expected: 전체 PASS

- [ ] **Step 6: 커밋**

```bash
git add herdr-plugin/src/api/sse.js herdr-plugin/src/ui/App.jsx herdr-plugin/test/sse.test.js
git commit -m "feat(herdr-plugin): SSE 실시간 갱신과 폴링 강등"
```

---

## Phase 3 — 쓰기와 마우스

이 단계가 끝나면 플러그인이 완성된다.

### Task 12: 낙관적 갱신과 상태 변경

**Files:**
- Create: `herdr-plugin/src/mutations.js`
- Modify: `herdr-plugin/src/ui/App.jsx`
- Test: `herdr-plugin/test/mutations.test.js`

**Interfaces:**
- Consumes: `store.js` 의 `upsertCard`, `removeCard`, `getState`, `setError`
- Produces:
  - `createMutations({ store, client }) -> mutations`
  - `mutations.changeStatus(cardId, statusKey, { confirmSubtasks }) -> Promise<'done'|'needs-confirm'|'failed'>`
  - `mutations.updateCard(cardId, patch) -> Promise<boolean>`
  - `mutations.createCard(projectId, fields) -> Promise<Todo|null>`
  - `mutations.createSubtask(parentId, fields) -> Promise<Todo|null>`
  - `mutations.deleteCard(cardId) -> Promise<boolean>`
  - `mutations.addComment(cardId, content) -> Promise<boolean>`
  - `confirmSubtasks` 가 `false` 이고 미완료 하위가 있으면 `'needs-confirm'` 을 돌려주고 아무것도 바꾸지 않는다

- [ ] **Step 1: 실패하는 테스트 작성**

```js
// herdr-plugin/test/mutations.test.js
import { describe, it, expect, vi } from 'vitest';
import { createMutations } from '../src/mutations.js';
import { createStore } from '../src/store.js';

const statuses = [
  { statusKey: 'TODO', name: '할 일', semanticStatus: 'TODO', position: 0 },
  { statusKey: 'DONE', name: '완료', semanticStatus: 'DONE', position: 1 },
];
const todos = [{ id: 1, summary: '일감', statusKey: 'TODO', priority: 'HIGH' }];

function setup(over = {}) {
  const client = {
    listProjects: vi.fn().mockResolvedValue([{ id: 3, name: 'P' }]),
    listStatuses: vi.fn().mockResolvedValue(statuses),
    listTodos: vi.fn().mockResolvedValue(todos),
    listSubtasks: vi.fn().mockResolvedValue([]),
    changeStatus: vi.fn().mockResolvedValue({ id: 1, summary: '일감', statusKey: 'DONE' }),
    updateTodo: vi.fn().mockResolvedValue({ id: 1, summary: '고침', statusKey: 'TODO' }),
    createTodo: vi.fn().mockResolvedValue({ id: 2, summary: '새 일감', statusKey: 'TODO' }),
    deleteTodo: vi.fn().mockResolvedValue(undefined),
    addComment: vi.fn().mockResolvedValue({ id: 9, content: '댓글' }),
    ...over,
  };
  const store = createStore({ client });
  return { store, client, mutations: createMutations({ store, client }) };
}

describe('상태 변경', () => {
  it('요청 전에 화면을 먼저 바꾼다', async () => {
    const { store, mutations, client } = setup();
    await store.loadBoard(3);

    let moved = false;
    client.changeStatus.mockImplementation(async () => {
      moved = store.getState().cardsByStatus.DONE.some(c => c.id === 1);
      return { id: 1, summary: '일감', statusKey: 'DONE' };
    });

    await mutations.changeStatus(1, 'DONE', { confirmSubtasks: true });
    expect(moved).toBe(true);
  });

  it('성공하면 서버 응답으로 마무리한다', async () => {
    const { store, mutations } = setup();
    await store.loadBoard(3);
    await mutations.changeStatus(1, 'DONE', { confirmSubtasks: true });
    expect(store.getState().cardsByStatus.DONE.map(c => c.id)).toEqual([1]);
    expect(store.getState().cardsByStatus.TODO).toEqual([]);
  });

  it('실패하면 원래 칸으로 되돌린다', async () => {
    const { store, mutations } = setup({
      changeStatus: vi.fn().mockRejectedValue(Object.assign(new Error('x'), { message: '서버 오류' })),
    });
    await store.loadBoard(3);
    const r = await mutations.changeStatus(1, 'DONE', { confirmSubtasks: true });

    expect(r).toBe('failed');
    expect(store.getState().cardsByStatus.TODO.map(c => c.id)).toEqual([1]);
    expect(store.getState().cardsByStatus.DONE).toEqual([]);
    expect(store.getState().error).toBe('서버 오류');
  });

  it('완료 칸으로 옮길 때 미완료 하위가 있으면 확인을 요구한다', async () => {
    const { store, mutations, client } = setup({
      listSubtasks: vi.fn().mockResolvedValue([
        { id: 11, statusKey: 'DONE' }, { id: 12, statusKey: 'TODO' },
      ]),
    });
    await store.loadBoard(3);
    const r = await mutations.changeStatus(1, 'DONE', { confirmSubtasks: false });

    expect(r).toBe('needs-confirm');
    expect(client.changeStatus).not.toHaveBeenCalled();
    expect(store.getState().cardsByStatus.TODO.map(c => c.id)).toEqual([1]);
  });

  it('확인을 받으면 그대로 진행한다', async () => {
    const { store, mutations, client } = setup({
      listSubtasks: vi.fn().mockResolvedValue([{ id: 12, statusKey: 'TODO' }]),
    });
    await store.loadBoard(3);
    const r = await mutations.changeStatus(1, 'DONE', { confirmSubtasks: true });
    expect(r).toBe('done');
    expect(client.changeStatus).toHaveBeenCalledWith(1, 'DONE');
  });

  it('완료가 아닌 칸으로 옮길 때는 하위를 확인하지 않는다', async () => {
    const { store, mutations, client } = setup();
    await store.loadBoard(3);
    await mutations.changeStatus(1, 'TODO', { confirmSubtasks: false });
    expect(client.listSubtasks).not.toHaveBeenCalled();
  });
});

describe('수정', () => {
  it('성공하면 서버 응답을 반영한다', async () => {
    const { store, mutations } = setup();
    await store.loadBoard(3);
    await mutations.updateCard(1, { summary: '고침' });
    expect(store.getState().cardsByStatus.TODO[0].summary).toBe('고침');
  });

  it('실패하면 원래 내용으로 되돌린다', async () => {
    const { store, mutations } = setup({
      updateTodo: vi.fn().mockRejectedValue(Object.assign(new Error('x'), { message: '수정 실패' })),
    });
    await store.loadBoard(3);
    await mutations.updateCard(1, { summary: '고침' });
    expect(store.getState().cardsByStatus.TODO[0].summary).toBe('일감');
    expect(store.getState().error).toBe('수정 실패');
  });
});

describe('삭제', () => {
  it('성공하면 카드가 사라진다', async () => {
    const { store, mutations } = setup();
    await store.loadBoard(3);
    expect(await mutations.deleteCard(1)).toBe(true);
    expect(store.getState().cardsByStatus.TODO).toEqual([]);
  });

  it('실패하면 카드를 되살린다', async () => {
    const { store, mutations } = setup({
      deleteTodo: vi.fn().mockRejectedValue(Object.assign(new Error('x'), { message: '삭제 실패' })),
    });
    await store.loadBoard(3);
    expect(await mutations.deleteCard(1)).toBe(false);
    expect(store.getState().cardsByStatus.TODO.map(c => c.id)).toEqual([1]);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `cd herdr-plugin; npx vitest run test/mutations.test.js`
Expected: FAIL — 모듈 없음

- [ ] **Step 3: 구현**

```js
// herdr-plugin/src/mutations.js

/** 상태 저장소에서 카드 하나를 찾는다. */
function findCard(state, cardId) {
  for (const list of Object.values(state.cardsByStatus)) {
    const hit = list.find(c => c.id === cardId);
    if (hit) return hit;
  }
  return null;
}

/** statusKey 가 완료 의미인지 본다. */
function isDoneStatus(state, statusKey) {
  const s = state.statuses.find(x => x.statusKey === statusKey);
  return (s?.semanticStatus ?? statusKey) === 'DONE';
}

export function createMutations({ store, client }) {
  /** 낙관적 갱신 공통 절차: 먼저 바꾸고, 실패하면 되돌린다. */
  async function optimistic({ before, apply, request, rollback }) {
    apply();
    try {
      const result = await request();
      return { ok: true, result };
    } catch (e) {
      rollback(before);
      store.setError(e.message);
      return { ok: false };
    }
  }

  return {
    async changeStatus(cardId, statusKey, { confirmSubtasks = false } = {}) {
      const state = store.getState();
      const card = findCard(state, cardId);
      if (!card) return 'failed';
      if ((card.statusKey ?? card.status) === statusKey) return 'done';

      // 완료로 옮길 때만 하위 일감을 확인한다
      if (!confirmSubtasks && isDoneStatus(state, statusKey)) {
        let subs = [];
        try {
          subs = await client.listSubtasks(cardId);
        } catch {
          subs = [];   // 확인에 실패해도 이동 자체는 막지 않는다
        }
        const pending = subs.filter(s => (s.statusKey ?? s.status) !== 'DONE');
        if (pending.length > 0) return 'needs-confirm';
      }

      const r = await optimistic({
        before: card,
        apply: () => store.upsertCard({ ...card, statusKey, status: statusKey }),
        request: () => client.changeStatus(cardId, statusKey),
        rollback: (orig) => store.upsertCard(orig),
      });

      if (!r.ok) return 'failed';
      if (r.result) store.upsertCard(r.result);
      return 'done';
    },

    async updateCard(cardId, patch) {
      const card = findCard(store.getState(), cardId);
      if (!card) return false;

      const r = await optimistic({
        before: card,
        apply: () => store.upsertCard({ ...card, ...patch }),
        request: () => client.updateTodo(cardId, patch),
        rollback: (orig) => store.upsertCard(orig),
      });

      if (r.ok && r.result) store.upsertCard(r.result);
      return r.ok;
    },

    async createCard(projectId, fields) {
      // 생성은 서버가 id 를 정하므로 낙관적 갱신을 하지 않는다
      try {
        const created = await client.createTodo(projectId, fields);
        store.upsertCard(created);
        return created;
      } catch (e) {
        store.setError(e.message);
        return null;
      }
    },

    async createSubtask(parentId, fields) {
      try {
        const created = await client.createSubtask(parentId, fields);
        store.upsertCard(created);
        return created;
      } catch (e) {
        store.setError(e.message);
        return null;
      }
    },

    async deleteCard(cardId) {
      const card = findCard(store.getState(), cardId);
      if (!card) return false;

      const r = await optimistic({
        before: card,
        apply: () => store.removeCard(cardId),
        request: () => client.deleteTodo(cardId),
        rollback: (orig) => store.upsertCard(orig),
      });
      return r.ok;
    },

    async addComment(cardId, content) {
      try {
        await client.addComment(cardId, content);
        return true;
      } catch (e) {
        store.setError(e.message);
        return false;
      }
    },
  };
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `cd herdr-plugin; npx vitest run test/mutations.test.js`
Expected: PASS (11개)

- [ ] **Step 5: 커밋**

```bash
git add herdr-plugin/src/mutations.js herdr-plugin/test/mutations.test.js
git commit -m "feat(herdr-plugin): 낙관적 갱신과 상태 변경"
```

---

### Task 13: 상태 변경 팝업과 확인 대화

**Files:**
- Create: `herdr-plugin/src/ui/Palette.jsx`
- Create: `herdr-plugin/src/ui/Confirm.jsx`
- Modify: `herdr-plugin/src/ui/App.jsx`
- Test: `herdr-plugin/test/ui-palette.test.jsx`

**Interfaces:**
- Consumes: `mutations.js`
- Produces:
  - `<Palette title items selectedIndex />` — `items` 는 `[{ id, label, color? }]`
  - `<Confirm message detail onYes onNo />`

- [ ] **Step 1: 실패하는 테스트 작성**

```jsx
// herdr-plugin/test/ui-palette.test.jsx
import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import { Palette } from '../src/ui/Palette.jsx';
import { Confirm } from '../src/ui/Confirm.jsx';

const items = [
  { id: 'TODO', label: '할 일', color: '#2563EB' },
  { id: 'DONE', label: '완료', color: '#059669' },
];

describe('Palette', () => {
  it('제목과 항목을 보여준다', () => {
    const f = render(<Palette title="상태 변경" items={items} selectedIndex={0} />).lastFrame();
    expect(f).toContain('상태 변경');
    expect(f).toContain('할 일');
    expect(f).toContain('완료');
  });

  it('선택한 항목에 표시를 붙인다', () => {
    const f = render(<Palette title="상태 변경" items={items} selectedIndex={1} />).lastFrame();
    const line = f.split('\n').find(l => l.includes('완료'));
    expect(line).toMatch(/[>›▸]/);
  });

  it('항목이 없으면 안내를 보여준다', () => {
    const f = render(<Palette title="상태 변경" items={[]} selectedIndex={0} />).lastFrame();
    expect(f).toContain('항목이 없습니다');
  });
});

describe('Confirm', () => {
  it('메시지와 선택지를 보여준다', () => {
    const f = render(<Confirm message="삭제할까요?" detail="하위 2건이 함께 지워집니다" />).lastFrame();
    expect(f).toContain('삭제할까요?');
    expect(f).toContain('하위 2건');
    expect(f).toContain('y');
    expect(f).toContain('n');
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `cd herdr-plugin; npx vitest run test/ui-palette.test.jsx`
Expected: FAIL — 모듈 없음

- [ ] **Step 3: 구현**

```jsx
// herdr-plugin/src/ui/Palette.jsx
import { Box, Text } from 'ink';

export function Palette({ title, items, selectedIndex }) {
  return (
    <Box flexDirection="column" borderStyle="round" borderColor="cyan" paddingX={2} paddingY={1}>
      <Text bold color="cyan">{title}</Text>
      <Text> </Text>
      {items.length === 0
        ? <Text color="gray">항목이 없습니다</Text>
        : items.map((it, i) => (
            <Text key={it.id} color={i === selectedIndex ? 'cyan' : undefined}
                  bold={i === selectedIndex}>
              {i === selectedIndex ? '> ' : '  '}
              <Text color={it.color}>{it.label}</Text>
            </Text>
          ))}
      <Text> </Text>
      <Text color="gray">j/k 이동  Enter 선택  Esc 취소</Text>
    </Box>
  );
}
```

```jsx
// herdr-plugin/src/ui/Confirm.jsx
import { Box, Text } from 'ink';

export function Confirm({ message, detail }) {
  return (
    <Box flexDirection="column" borderStyle="round" borderColor="yellow" paddingX={2} paddingY={1}>
      <Text bold color="yellow">{message}</Text>
      {detail && <Text color="gray">{detail}</Text>}
      <Text> </Text>
      <Text>
        <Text bold color="green">y</Text>
        <Text color="gray"> 예    </Text>
        <Text bold color="red">n</Text>
        <Text color="gray"> 아니오 (Esc 도 취소)</Text>
      </Text>
    </Box>
  );
}
```

- [ ] **Step 4: App 에 모달 상태 붙이기**

`App.jsx` 에 모달 상태를 하나 둔다. 동시에 두 개가 뜨지 않도록 단일 값으로 관리한다.

```jsx
// modal 은 다음 중 하나다
// null
// { kind: 'status', index: 0 }
// { kind: 'confirm', message, detail, onYes }
// { kind: 'project', index: 0 }
// { kind: 'form', mode: 'new'|'edit'|'subtask', draft: {...}, field: 0 }
// { kind: 'input', title, value, onSubmit }   // 검색·댓글에 함께 쓴다
// { kind: 'help' }
const [modal, setModal] = useState(null);
```

키 처리에서 모달이 떠 있으면 모달 전용 처리를 먼저 하고 보드 키는 건너뛴다.

```jsx
useInput((input, key) => {
  if (modal) return handleModalKey(input, key);
  const action = resolveKey(input, key);
  if (!action) return;
  // ... 보드 키 처리
});
```

`change-status` 동작은 `setModal({ kind: 'status', index: 현재칸위치 })` 로 팝업을 띄우고,
선택이 확정되면 `mutations.changeStatus` 를 부른다.
반환값이 `'needs-confirm'` 이면 확인 모달로 바꾼다.

```jsx
async function applyStatus(statusKey) {
  const id = state.selected?.cardId;
  if (!id) return setModal(null);

  const r = await mutations.changeStatus(id, statusKey, { confirmSubtasks: false });
  if (r === 'needs-confirm') {
    const subs = await client.listSubtasks(id);
    const pending = subs.filter(s => (s.statusKey ?? s.status) !== 'DONE').length;
    setModal({
      kind: 'confirm',
      message: '완료로 옮길까요?',
      detail: `하위 ${pending}건이 아직 완료되지 않았습니다.`,
      onYes: () => mutations.changeStatus(id, statusKey, { confirmSubtasks: true }),
    });
    return;
  }
  setModal(null);
}
```

`move-status-left` 와 `move-status-right` 는 팝업 없이 인접 칸을 계산해 같은 함수를 부른다.

- [ ] **Step 5: 테스트 통과 확인**

Run: `cd herdr-plugin; npx vitest run`
Expected: 전체 PASS

- [ ] **Step 6: 실제 확인**

Run: `cd herdr-plugin; npm run build`
pane 을 열고 사용자에게 `Space` 로 상태를 바꿔 보고, 하위 일감이 있는 항목을
완료로 옮겨 확인 창이 뜨는지 봐 달라고 요청한다.

- [ ] **Step 7: 커밋**

```bash
git add herdr-plugin/src/ui/ herdr-plugin/test/ui-palette.test.jsx
git commit -m "feat(herdr-plugin): 상태 변경 팝업과 확인 대화"
```

---

### Task 14: 생성·수정 폼과 에디터 위임

**Files:**
- Create: `herdr-plugin/src/ui/Form.jsx`
- Create: `herdr-plugin/src/editor.js`
- Modify: `herdr-plugin/src/ui/App.jsx`
- Test: `herdr-plugin/test/editor.test.js`
- Test: `herdr-plugin/test/ui-form.test.jsx`

**Interfaces:**
- Consumes: `mutations.js`
- Produces:
  - `<Form title draft field />` — `draft` 는 `{ summary, priority, dueDate }`, `field` 는 포커스 위치(0..2)
  - `editDescription(current, { spawn?, tmpDir? }) -> Promise<string|null>` — 취소하면 `null`
  - `pickEditor() -> string` — `$VISUAL`, `$EDITOR`, 플랫폼 기본값 순

- [ ] **Step 1: 에디터 위임 테스트 작성**

```js
// herdr-plugin/test/editor.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { editDescription, pickEditor } from '../src/editor.js';

let dir;
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'hk-ed-')); });
afterEach(() => { rmSync(dir, { recursive: true, force: true }); vi.unstubAllEnvs(); });

describe('pickEditor', () => {
  it('VISUAL 을 가장 먼저 쓴다', () => {
    vi.stubEnv('VISUAL', 'code -w');
    vi.stubEnv('EDITOR', 'vim');
    expect(pickEditor()).toBe('code -w');
  });

  it('VISUAL 이 없으면 EDITOR 를 쓴다', () => {
    vi.stubEnv('VISUAL', '');
    vi.stubEnv('EDITOR', 'nano');
    expect(pickEditor()).toBe('nano');
  });

  it('둘 다 없으면 플랫폼 기본값을 쓴다', () => {
    vi.stubEnv('VISUAL', '');
    vi.stubEnv('EDITOR', '');
    expect(pickEditor()).toBeTruthy();
  });
});

describe('editDescription', () => {
  it('임시 파일에 현재 내용을 담아 에디터에 넘긴다', async () => {
    let seenPath;
    const spawn = vi.fn((cmd, args) => {
      seenPath = args[args.length - 1];
      expect(readFileSync(seenPath, 'utf8')).toBe('원래 내용');
      return { on: (ev, cb) => ev === 'close' && cb(0) };
    });

    await editDescription('원래 내용', { spawn, tmpDir: dir });
    expect(spawn).toHaveBeenCalled();
  });

  it('편집 결과를 돌려준다', async () => {
    const spawn = vi.fn((cmd, args) => {
      writeFileSync(args[args.length - 1], '고친 내용');
      return { on: (ev, cb) => ev === 'close' && cb(0) };
    });

    expect(await editDescription('원래', { spawn, tmpDir: dir })).toBe('고친 내용');
  });

  it('에디터가 실패하면 null 을 돌려준다', async () => {
    const spawn = vi.fn(() => ({ on: (ev, cb) => ev === 'close' && cb(1) }));
    expect(await editDescription('원래', { spawn, tmpDir: dir })).toBeNull();
  });

  it('임시 파일을 남기지 않는다', async () => {
    let path;
    const spawn = vi.fn((cmd, args) => {
      path = args[args.length - 1];
      return { on: (ev, cb) => ev === 'close' && cb(0) };
    });
    await editDescription('원래', { spawn, tmpDir: dir });
    expect(() => readFileSync(path, 'utf8')).toThrow();
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `cd herdr-plugin; npx vitest run test/editor.test.js`
Expected: FAIL — 모듈 없음

- [ ] **Step 3: 에디터 위임 구현**

```js
// herdr-plugin/src/editor.js
import { spawn as nodeSpawn } from 'node:child_process';
import { writeFileSync, readFileSync, unlinkSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir, platform } from 'node:os';

/** $VISUAL, $EDITOR, 플랫폼 기본값 순으로 에디터를 고른다. */
export function pickEditor() {
  const visual = process.env.VISUAL?.trim();
  if (visual) return visual;

  const editor = process.env.EDITOR?.trim();
  if (editor) return editor;

  return platform() === 'win32' ? 'notepad' : 'vi';
}

/**
 * 현재 설명을 임시 파일에 담아 에디터로 열고, 저장된 내용을 돌려준다.
 * 취소하거나 에디터가 실패하면 null 을 돌려준다.
 * 임시 파일은 어떤 경로로 끝나든 반드시 지운다.
 */
export function editDescription(current, { spawn = nodeSpawn, tmpDir } = {}) {
  const dir = tmpDir ?? mkdtempSync(join(tmpdir(), 'herdr-kanban-'));
  const file = join(dir, 'description.md');
  writeFileSync(file, current ?? '', 'utf8');

  const [cmd, ...args] = pickEditor().split(/\s+/);

  return new Promise((resolve) => {
    const child = spawn(cmd, [...args, file], { stdio: 'inherit' });

    child.on('close', (code) => {
      let result = null;
      if (code === 0) {
        try { result = readFileSync(file, 'utf8'); } catch { result = null; }
      }
      try { unlinkSync(file); } catch { /* 이미 없으면 그만이다 */ }
      resolve(result);
    });

    child.on?.('error', () => {
      try { unlinkSync(file); } catch { /* 무시 */ }
      resolve(null);
    });
  });
}
```

- [ ] **Step 4: 폼 테스트 작성**

```jsx
// herdr-plugin/test/ui-form.test.jsx
import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import { Form } from '../src/ui/Form.jsx';

const draft = { summary: '새 일감', priority: 'MEDIUM', dueDate: '2026-09-10' };

describe('Form', () => {
  it('제목과 입력 항목을 보여준다', () => {
    const f = render(<Form title="새 일감" draft={draft} field={0} />).lastFrame();
    expect(f).toContain('새 일감');
    expect(f).toContain('제목');
    expect(f).toContain('우선순위');
    expect(f).toContain('마감일');
  });

  it('현재 값을 보여준다', () => {
    const f = render(<Form title="수정" draft={draft} field={0} />).lastFrame();
    expect(f).toContain('2026-09-10');
    expect(f).toContain('보통');
  });

  it('포커스한 항목을 표시한다', () => {
    const f = render(<Form title="수정" draft={draft} field={2} />).lastFrame();
    const line = f.split('\n').find(l => l.includes('마감일'));
    expect(line).toMatch(/[>›▸]/);
  });

  it('제목이 비면 경고를 보여준다', () => {
    const f = render(<Form title="새 일감" draft={{ ...draft, summary: '' }} field={0} />).lastFrame();
    expect(f).toContain('제목을 입력해 주십시오');
  });
});
```

- [ ] **Step 5: 폼 구현**

```jsx
// herdr-plugin/src/ui/Form.jsx
import { Box, Text } from 'ink';

const PRIORITY_LABEL = { HIGH: '높음', MEDIUM: '보통', LOW: '낮음' };

function Field({ label, value, focused, hint }) {
  return (
    <Box>
      <Text color={focused ? 'cyan' : 'gray'}>{focused ? '> ' : '  '}</Text>
      <Box width={10}><Text color="gray">{label}</Text></Box>
      <Text bold={focused}>{value || <Text color="gray">(비어 있음)</Text>}</Text>
      {focused && hint && <Text color="gray">  {hint}</Text>}
    </Box>
  );
}

export function Form({ title, draft, field }) {
  const empty = !draft.summary?.trim();

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="cyan"
         paddingX={2} paddingY={1} width={60}>
      <Text bold color="cyan">{title}</Text>
      <Text> </Text>

      <Field label="제목" value={draft.summary} focused={field === 0} />
      <Field label="우선순위" value={PRIORITY_LABEL[draft.priority] ?? '보통'}
             focused={field === 1} hint="좌우 화살표로 변경" />
      <Field label="마감일" value={draft.dueDate} focused={field === 2}
             hint="YYYY-MM-DD, 비우면 없음" />

      <Text> </Text>
      {empty
        ? <Text color="red">제목을 입력해 주십시오</Text>
        : <Text color="gray">Tab 다음 항목  Enter 저장  Esc 취소  Ctrl+E 설명 편집</Text>}
    </Box>
  );
}
```

- [ ] **Step 6: App 에 연결**

`new`, `subtask`, `edit` 동작에서 `setModal({ kind:'form', mode, draft, field: 0 })` 로 폼을 띄운다.
폼 안에서의 키 처리는 다음과 같다.

- `Tab` / `Shift+Tab`: `field` 를 순환한다
- 문자 입력: `field` 가 0 이면 `summary`, 2 면 `dueDate` 에 붙인다
- 좌우 화살표: `field` 가 1 이면 우선순위를 `LOW`-`MEDIUM`-`HIGH` 로 돌린다
- `Backspace`: 현재 항목의 마지막 글자를 지운다
- `Enter`: 제목이 비어 있지 않으면 저장한다
- `Ctrl+E`: Ink 를 잠시 멈추고 `editDescription` 을 부른다

`Ctrl+E` 처리는 화면 충돌을 피해야 하므로 다음 순서를 지킨다.

```jsx
async function openEditor() {
  const { unmount, rerender } = inkInstance;   // cli.jsx 에서 render() 결과를 넘겨받는다
  unmount();
  const next = await editDescription(modal.draft.description ?? '');
  rerender(<App ... />);
  if (next !== null) setModal(m => ({ ...m, draft: { ...m.draft, description: next } }));
}
```

`unmount` 없이 외부 에디터를 띄우면 Ink 의 화면 갱신과 에디터가 같은 터미널을
서로 덮어써 화면이 깨진다. 반드시 멈췄다가 다시 그린다.

- [ ] **Step 7: 테스트 통과 확인**

Run: `cd herdr-plugin; npx vitest run`
Expected: 전체 PASS

- [ ] **Step 8: 실제 확인**

`n` 으로 일감을 만들고, `e` 로 고치고, `Ctrl+E` 로 설명을 편집한 뒤
에디터를 닫았을 때 화면이 정상으로 돌아오는지 사용자에게 확인을 요청한다.

- [ ] **Step 9: 커밋**

```bash
git add herdr-plugin/src/ui/Form.jsx herdr-plugin/src/editor.js herdr-plugin/src/ui/App.jsx herdr-plugin/test/
git commit -m "feat(herdr-plugin): 생성·수정 폼과 에디터 위임"
```

---

### Task 15: 삭제, 댓글, 검색, 프로젝트 전환, 도움말

남은 키 동작을 한꺼번에 붙인다. 각각이 작아서 따로 나눌 값이 없다.

**Files:**
- Create: `herdr-plugin/src/ui/Input.jsx`
- Create: `herdr-plugin/src/ui/Help.jsx`
- Modify: `herdr-plugin/src/ui/App.jsx`
- Modify: `herdr-plugin/src/config.js` (마지막 프로젝트 저장)
- Test: `herdr-plugin/test/ui-input.test.jsx`

**Interfaces:**
- Consumes: `mutations.js`, `config.js` 의 `saveConfig`
- Produces:
  - `<Input title value placeholder />` — 한 줄 입력. 검색과 댓글이 함께 쓴다
  - `<Help />` — 키 목록

- [ ] **Step 1: 실패하는 테스트 작성**

```jsx
// herdr-plugin/test/ui-input.test.jsx
import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import { Input } from '../src/ui/Input.jsx';
import { Help } from '../src/ui/Help.jsx';

describe('Input', () => {
  it('제목과 입력값을 보여준다', () => {
    const f = render(<Input title="검색" value="배치" />).lastFrame();
    expect(f).toContain('검색');
    expect(f).toContain('배치');
  });

  it('값이 비면 안내 문구를 보여준다', () => {
    const f = render(<Input title="댓글" value="" placeholder="내용을 입력하세요" />).lastFrame();
    expect(f).toContain('내용을 입력하세요');
  });
});

describe('Help', () => {
  it('주요 키를 모두 보여준다', () => {
    const f = render(<Help />).lastFrame();
    for (const k of ['j', 'k', 'h', 'l', 'n', 'e', 'x', 'c', 'p', 'q']) {
      expect(f).toContain(k);
    }
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `cd herdr-plugin; npx vitest run test/ui-input.test.jsx`
Expected: FAIL — 모듈 없음

- [ ] **Step 3: 구현**

```jsx
// herdr-plugin/src/ui/Input.jsx
import { Box, Text } from 'ink';

export function Input({ title, value, placeholder = '' }) {
  return (
    <Box flexDirection="column" borderStyle="round" borderColor="cyan"
         paddingX={2} width={60}>
      <Text bold color="cyan">{title}</Text>
      <Text>
        {value || <Text color="gray">{placeholder}</Text>}
        <Text color="cyan">_</Text>
      </Text>
      <Text color="gray">Enter 확인  Esc 취소</Text>
    </Box>
  );
}
```

```jsx
// herdr-plugin/src/ui/Help.jsx
import { Box, Text } from 'ink';

const GROUPS = [
  ['이동', [
    ['j / k', '카드 위아래'],
    ['h / l', '칸 좌우'],
    ['g / G', '칸의 처음 / 끝'],
    ['Tab', '보드와 상세 전환'],
  ]],
  ['보기', [
    ['Enter', '상세 열기'],
    ['/', '제목 검색'],
    ['f', '필터'],
    ['p', '프로젝트 전환'],
    ['r', '새로고침'],
  ]],
  ['편집', [
    ['n', '새 일감'],
    ['s', '하위 일감'],
    ['e / E', '수정 / 설명 편집'],
    ['Space', '상태 변경'],
    ['H / L', '옆 칸으로 이동'],
    ['c', '댓글'],
    ['x', '삭제'],
  ]],
  ['기타', [
    ['m', '마우스 켜기·끄기'],
    ['?', '이 도움말'],
    ['q', '종료'],
  ]],
];

export function Help() {
  return (
    <Box flexDirection="column" borderStyle="round" borderColor="cyan"
         paddingX={2} paddingY={1}>
      <Text bold color="cyan">도움말</Text>
      {GROUPS.map(([name, rows]) => (
        <Box key={name} flexDirection="column" marginTop={1}>
          <Text bold color="gray">{name}</Text>
          {rows.map(([k, desc]) => (
            <Box key={k}>
              <Box width={10}><Text color="yellow">{k}</Text></Box>
              <Text>{desc}</Text>
            </Box>
          ))}
        </Box>
      ))}
      <Text> </Text>
      <Text color="gray">아무 키나 누르면 닫힙니다</Text>
    </Box>
  );
}
```

- [ ] **Step 4: App 에 동작 연결**

| 동작 | 처리 |
|------|------|
| `delete` | 하위 일감 수를 세어 `Confirm` 을 띄우고, `y` 면 `mutations.deleteCard` |
| `comment` | `Input` 을 띄우고 확인 시 `mutations.addComment` |
| `search` | `Input` 을 띄우되 입력할 때마다 `store.setFilter({ query })` 를 부른다 |
| `filter` | `Palette` 로 우선순위를 고르게 하고 `store.setFilter({ priority })` |
| `project` | `Palette` 로 프로젝트를 고르고 `store.loadBoard(id)` 후 `saveConfig` 로 `lastProjectId` 저장 |
| `help` | `setModal({ kind: 'help' })` |
| `toggle-focus` | `store.setFocus(state.focus === 'board' ? 'detail' : 'board')` |
| `column-first` / `column-last` | 현재 칸의 첫·마지막 카드를 선택 |

삭제 확인 문구는 하위 일감 유무로 갈린다.

```jsx
const subs = await client.listSubtasks(id);
setModal({
  kind: 'confirm',
  message: `#${id} 를 삭제할까요?`,
  detail: subs.length > 0
    ? `하위 일감 ${subs.length}건도 함께 삭제됩니다. 되돌릴 수 없습니다.`
    : '되돌릴 수 없습니다.',
  onYes: () => mutations.deleteCard(id),
});
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `cd herdr-plugin; npx vitest run`
Expected: 전체 PASS

- [ ] **Step 6: 커밋**

```bash
git add herdr-plugin/src/ui/ herdr-plugin/src/config.js herdr-plugin/test/
git commit -m "feat(herdr-plugin): 삭제·댓글·검색·프로젝트 전환·도움말"
```

---

### Task 16: 마우스 클릭과 휠

**Files:**
- Create: `herdr-plugin/src/input/mouse.js`
- Modify: `herdr-plugin/src/ui/App.jsx`
- Test: `herdr-plugin/test/mouse.test.js`

**Interfaces:**
- Consumes: `input/hit.js`
- Produces:
  - `parseMouse(data) -> { button, col, row, kind } | null` — `kind` 는 `'down'|'up'|'move'|'wheel-up'|'wheel-down'`
    - 좌표는 **0부터 시작하도록 변환**한다. SGR 은 1부터 세므로 1을 뺀다
  - `enableMouse(stdout) -> void`, `disableMouse(stdout) -> void`
  - `createMouseHandler({ getLayout, onClick, onDoubleClick, onWheel, onDragStart, onDragMove, onDragEnd }) -> (event) => void`

- [ ] **Step 1: 실패하는 테스트 작성**

```js
// herdr-plugin/test/mouse.test.js
import { describe, it, expect, vi } from 'vitest';
import { parseMouse, enableMouse, disableMouse } from '../src/input/mouse.js';

describe('parseMouse', () => {
  it('누름을 해석한다', () => {
    expect(parseMouse('\x1b[<0;10;5M')).toEqual({ button: 0, col: 9, row: 4, kind: 'down' });
  });

  it('뗌을 해석한다', () => {
    expect(parseMouse('\x1b[<0;10;5m')).toEqual({ button: 0, col: 9, row: 4, kind: 'up' });
  });

  it('SGR 의 1 기준 좌표를 0 기준으로 바꾼다', () => {
    expect(parseMouse('\x1b[<0;1;1M')).toMatchObject({ col: 0, row: 0 });
  });

  it('드래그(버튼 32 이상)를 move 로 본다', () => {
    expect(parseMouse('\x1b[<32;10;5M')).toMatchObject({ kind: 'move' });
  });

  it('휠 위는 wheel-up 이다', () => {
    expect(parseMouse('\x1b[<64;10;5M')).toMatchObject({ kind: 'wheel-up' });
  });

  it('휠 아래는 wheel-down 이다', () => {
    expect(parseMouse('\x1b[<65;10;5M')).toMatchObject({ kind: 'wheel-down' });
  });

  it('마우스가 아닌 입력은 null 이다', () => {
    expect(parseMouse('j')).toBeNull();
    expect(parseMouse('\x1b[A')).toBeNull();
  });
});

describe('enable/disableMouse', () => {
  it('활성화 시퀀스를 쓴다', () => {
    const stdout = { write: vi.fn() };
    enableMouse(stdout);
    const written = stdout.write.mock.calls.map(c => c[0]).join('');
    expect(written).toContain('\x1b[?1000h');
    expect(written).toContain('\x1b[?1002h');
    expect(written).toContain('\x1b[?1006h');
  });

  it('비활성화는 활성화의 역순으로 끈다', () => {
    const stdout = { write: vi.fn() };
    disableMouse(stdout);
    const written = stdout.write.mock.calls.map(c => c[0]).join('');
    expect(written).toContain('\x1b[?1000l');
    expect(written).toContain('\x1b[?1002l');
    expect(written).toContain('\x1b[?1006l');
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `cd herdr-plugin; npx vitest run test/mouse.test.js`
Expected: FAIL — 모듈 없음

- [ ] **Step 3: 구현**

```js
// herdr-plugin/src/input/mouse.js
import { hitTest, columnAt } from './hit.js';

const ON = '\x1b[?1000h\x1b[?1002h\x1b[?1006h';
const OFF = '\x1b[?1006l\x1b[?1002l\x1b[?1000l';

const SGR = /\x1b\[<(\d+);(\d+);(\d+)([Mm])/;

export function enableMouse(stdout) { stdout.write(ON); }
export function disableMouse(stdout) { stdout.write(OFF); }

/**
 * SGR 마우스 시퀀스를 해석한다.
 * SGR 은 좌표를 1부터 세므로 화면 좌표계(0부터)로 맞춰 돌려준다.
 */
export function parseMouse(data) {
  const m = SGR.exec(data);
  if (!m) return null;

  const button = Number(m[1]);
  const col = Number(m[2]) - 1;
  const row = Number(m[3]) - 1;
  const released = m[4] === 'm';

  let kind;
  if (button === 64) kind = 'wheel-up';
  else if (button === 65) kind = 'wheel-down';
  else if (released) kind = 'up';
  else if (button >= 32) kind = 'move';
  else kind = 'down';

  return { button: button & 3, col, row, kind };
}

const DOUBLE_CLICK_MS = 400;
const DRAG_THRESHOLD = 1;   // 한 칸이라도 움직이면 드래그로 본다

/**
 * 마우스 이벤트를 화면 동작으로 옮긴다.
 * 누름-이동-뗌을 추적해 클릭과 드래그를 구분한다.
 */
export function createMouseHandler({
  getLayout, onClick, onDoubleClick, onWheel,
  onDragStart, onDragMove, onDragEnd,
  now = () => Date.now(),
}) {
  let press = null;      // { region, col, row, dragging }
  let lastClick = { id: null, at: 0 };

  return function handle(ev) {
    const layout = getLayout();
    if (!layout) return;

    if (ev.kind === 'wheel-up' || ev.kind === 'wheel-down') {
      const col = columnAt(layout, ev.col);
      if (col) onWheel(col, ev.kind === 'wheel-up' ? -1 : 1);
      return;
    }

    if (ev.kind === 'down') {
      const region = hitTest(layout.regions, ev.col, ev.row);
      press = region ? { region, col: ev.col, row: ev.row, dragging: false } : null;
      return;
    }

    if (ev.kind === 'move') {
      if (!press || press.region.kind !== 'card') return;

      const moved = Math.abs(ev.col - press.col) + Math.abs(ev.row - press.row);
      if (!press.dragging && moved > DRAG_THRESHOLD) {
        press.dragging = true;
        onDragStart(press.region.id);
      }
      if (press.dragging) onDragMove(columnAt(layout, ev.col), ev.col, ev.row);
      return;
    }

    if (ev.kind === 'up') {
      if (!press) return;
      const held = press;
      press = null;

      if (held.dragging) {
        onDragEnd(held.region.id, columnAt(layout, ev.col));
        return;
      }

      const region = hitTest(layout.regions, ev.col, ev.row);
      if (!region || region.id !== held.region.id) return;

      const at = now();
      const isDouble = lastClick.id === region.id && at - lastClick.at < DOUBLE_CLICK_MS;
      lastClick = { id: region.id, at };

      if (isDouble) onDoubleClick(region);
      else onClick(region);
    }
  };
}
```

- [ ] **Step 4: App 에 연결**

Ink 의 `useInput` 은 마우스 시퀀스를 키 입력으로 잘못 해석하므로,
마우스는 `useStdin` 으로 받은 raw stdin 에서 따로 처리한다.

```jsx
const { stdin, setRawMode } = useStdin();
const { stdout } = useStdout();
const [mouseOn, setMouseOn] = useState(true);
const layoutRef = useRef(null);
layoutRef.current = layout;   // 렌더할 때마다 최신 좌표표를 담아 둔다

useEffect(() => {
  if (!mouseOn) { disableMouse(stdout); return; }

  enableMouse(stdout);
  const handle = createMouseHandler({
    getLayout: () => layoutRef.current,
    onClick: (r) => { if (r.kind === 'card') selectByCardId(r.id);
                      if (r.kind === 'column-header') store.toggleCollapse(r.id);
                      if (r.kind === 'project-name') setModal({ kind: 'project', index: 0 }); },
    onDoubleClick: (r) => { if (r.kind === 'card') { selectByCardId(r.id); store.setFocus('detail'); } },
    onWheel: (statusKey, delta) => store.scrollColumn(statusKey, delta),
    onDragStart: (id) => setDragging(id),
    onDragMove: (statusKey) => setDropTarget(statusKey),
    onDragEnd: (id, statusKey) => { setDragging(null); setDropTarget(null);
                                    if (statusKey) applyStatusTo(id, statusKey); },
  });

  const onData = (buf) => {
    const ev = parseMouse(buf.toString());
    if (ev) handle(ev);
  };

  stdin.on('data', onData);
  return () => { stdin.off('data', onData); disableMouse(stdout); };
}, [mouseOn, stdin, stdout]);

// 어떤 경로로 끝나든 마우스 모드를 반드시 끈다
useEffect(() => {
  const off = () => disableMouse(process.stdout);
  process.on('exit', off);
  process.on('SIGINT', () => { off(); process.exit(130); });
  process.on('SIGTERM', () => { off(); process.exit(143); });
  return () => process.off('exit', off);
}, []);
```

**마우스 모드를 끄지 않고 종료하면 터미널이 클릭에 반응하지 않는 상태로 남는다.**
위의 정리 코드는 선택이 아니라 필수다.

`m` 키(`toggle-mouse`)는 `setMouseOn(v => !v)` 로 처리한다.

- [ ] **Step 5: 테스트 통과 확인**

Run: `cd herdr-plugin; npx vitest run`
Expected: 전체 PASS

- [ ] **Step 6: 실제 확인**

pane 에서 카드를 클릭·더블클릭하고 휠을 굴려 본다.
`m` 으로 껐을 때 터미널 드래그 선택이 돌아오는지도 확인한다.
`q` 로 종료한 뒤 그 pane 에서 마우스가 정상인지 반드시 확인한다.

- [ ] **Step 7: 커밋**

```bash
git add herdr-plugin/src/input/mouse.js herdr-plugin/src/ui/App.jsx herdr-plugin/test/mouse.test.js
git commit -m "feat(herdr-plugin): 마우스 클릭과 휠"
```

---

### Task 17: 드래그 앤 드롭

**Files:**
- Modify: `herdr-plugin/src/ui/Board.jsx` (드롭 대상 강조)
- Modify: `herdr-plugin/src/ui/App.jsx`
- Test: `herdr-plugin/test/mouse-drag.test.js`

**Interfaces:**
- Consumes: Task 16 의 `createMouseHandler`
- Produces: `<Board ... dragging={cardId|null} dropTarget={statusKey|null} />`

**목록 모드에서는 드래그를 지원하지 않는다.** `listRegions` 가 `column-header`
영역을 만들지 않으므로 `columnAt` 이 항상 `null` 을 돌려주고, 화면에 칸 구분도
없어 드롭 대상을 고를 수 없다. 의도된 제약이다. 대신 `layout.mode === 'list'`
일 때 화면 하단 안내에 "좁은 화면에서는 Space 로 상태를 바꿉니다" 를 덧붙여
사용자가 드래그를 시도했다가 아무 반응이 없어 혼란스러워하지 않게 한다.

- [ ] **Step 1: 드래그 흐름 테스트 작성**

```js
// herdr-plugin/test/mouse-drag.test.js
import { describe, it, expect, vi } from 'vitest';
import { createMouseHandler } from '../src/input/mouse.js';

const layout = {
  mode: 'board',
  visibleColumns: ['TODO', 'DONE'],
  regions: [
    { kind: 'column-header', id: 'TODO', x: 0, y: 2, w: 16, h: 1 },
    { kind: 'column-header', id: 'DONE', x: 18, y: 2, w: 16, h: 1 },
    { kind: 'card', id: 1, x: 0, y: 3, w: 16, h: 5 },
  ],
};

function handler(over = {}) {
  const spies = {
    onClick: vi.fn(), onDoubleClick: vi.fn(), onWheel: vi.fn(),
    onDragStart: vi.fn(), onDragMove: vi.fn(), onDragEnd: vi.fn(),
    ...over,
  };
  return { handle: createMouseHandler({ getLayout: () => layout, ...spies }), spies };
}

const down = (col, row) => ({ kind: 'down', button: 0, col, row });
const move = (col, row) => ({ kind: 'move', button: 0, col, row });
const up   = (col, row) => ({ kind: 'up', button: 0, col, row });

describe('드래그', () => {
  it('누르고 움직이면 드래그가 시작된다', () => {
    const { handle, spies } = handler();
    handle(down(5, 5));
    handle(move(10, 5));
    expect(spies.onDragStart).toHaveBeenCalledWith(1);
  });

  it('움직이지 않고 떼면 클릭이다', () => {
    const { handle, spies } = handler();
    handle(down(5, 5));
    handle(up(5, 5));
    expect(spies.onClick).toHaveBeenCalled();
    expect(spies.onDragStart).not.toHaveBeenCalled();
  });

  it('다른 칸에 떼면 그 칸을 알려준다', () => {
    const { handle, spies } = handler();
    handle(down(5, 5));
    handle(move(20, 5));
    handle(up(20, 5));
    expect(spies.onDragEnd).toHaveBeenCalledWith(1, 'DONE');
  });

  it('칸 밖에 떼면 대상이 null 이다', () => {
    const { handle, spies } = handler();
    handle(down(5, 5));
    handle(move(17, 5));
    handle(up(17, 5));
    expect(spies.onDragEnd).toHaveBeenCalledWith(1, null);
  });

  it('드래그 중에는 지나는 칸을 계속 알려준다', () => {
    const { handle, spies } = handler();
    handle(down(5, 5));
    handle(move(10, 5));
    handle(move(20, 5));
    expect(spies.onDragMove).toHaveBeenLastCalledWith('DONE', 20, 5);
  });

  it('빈 곳에서 시작한 드래그는 무시한다', () => {
    const { handle, spies } = handler();
    handle(down(17, 30));
    handle(move(20, 30));
    handle(up(20, 30));
    expect(spies.onDragStart).not.toHaveBeenCalled();
    expect(spies.onDragEnd).not.toHaveBeenCalled();
  });

  it('칸 머리는 드래그하지 않는다', () => {
    const { handle, spies } = handler();
    handle(down(5, 2));
    handle(move(20, 2));
    expect(spies.onDragStart).not.toHaveBeenCalled();
  });

  it('연속 드래그가 서로 섞이지 않는다', () => {
    const { handle, spies } = handler();
    handle(down(5, 5)); handle(move(20, 5)); handle(up(20, 5));
    handle(down(5, 5)); handle(up(5, 5));
    expect(spies.onDragEnd).toHaveBeenCalledTimes(1);
    expect(spies.onClick).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: 테스트 실행**

Run: `cd herdr-plugin; npx vitest run test/mouse-drag.test.js`
Expected: Task 16 의 구현으로 대부분 통과한다.
실패하는 항목이 있으면 `createMouseHandler` 를 고친다.
특히 "칸 머리는 드래그하지 않는다" 와 "연속 드래그가 섞이지 않는다" 를 확인한다.

- [ ] **Step 3: 드롭 대상 강조 확인**

`Board` 는 Task 8 에서 이미 `dragging` 과 `dropTarget` 을 받아
끌고 있는 카드를 흐리게, 대상 칸을 반전으로 표시하도록 만들어 두었다.
여기서는 `App` 에서 두 값을 실제로 넘기기만 하면 된다.

```jsx
const [dragging, setDragging] = useState(null);
const [dropTarget, setDropTarget] = useState(null);

// 렌더 부분
<Board layout={layout} statuses={state.statuses}
       cardsByStatus={state.cardsByStatus} selected={state.selected}
       dragging={dragging} dropTarget={dropTarget} />
```

강조가 보이지 않으면 `Board` 가 `dropTarget` 을 받고 있는지부터 확인한다.

- [ ] **Step 4: 드롭 시 확인 대화 연결**

`onDragEnd` 에서 완료 칸에 떨어뜨렸고 미완료 하위가 있으면
키보드와 똑같이 `Confirm` 모달을 띄운다. Task 13 의 `applyStatus` 를
카드 id 를 받도록 일반화해 재사용한다.

```jsx
async function applyStatusTo(cardId, statusKey) {
  const r = await mutations.changeStatus(cardId, statusKey, { confirmSubtasks: false });
  if (r !== 'needs-confirm') return;

  const subs = await client.listSubtasks(cardId);
  const pending = subs.filter(s => (s.statusKey ?? s.status) !== 'DONE').length;
  setModal({
    kind: 'confirm',
    message: '완료로 옮길까요?',
    detail: `하위 ${pending}건이 아직 완료되지 않았습니다.`,
    onYes: () => mutations.changeStatus(cardId, statusKey, { confirmSubtasks: true }),
  });
}
```

- [ ] **Step 5: 전체 테스트 통과 확인**

Run: `cd herdr-plugin; npx vitest run`
Expected: 전체 PASS

- [ ] **Step 6: 실제 확인 — 이 계획의 두 번째 관문**

`npm run build` 후 pane 을 열고 사용자에게 다음을 확인해 달라고 요청한다.

1. 카드를 다른 칸으로 끌어다 놓으면 이동하는가
2. 끄는 동안 대상 칸이 강조되는가
3. 칸 밖에 놓으면 취소되는가
4. 완료 칸에 놓았을 때 하위 일감 확인이 뜨는가
5. 이동 실패 시 카드가 원래 자리로 돌아오는가 (서버를 잠시 끄고 시험)

- [ ] **Step 7: 커밋**

```bash
git add herdr-plugin/src/ui/Board.jsx herdr-plugin/src/ui/App.jsx herdr-plugin/test/mouse-drag.test.js
git commit -m "feat(herdr-plugin): 드래그 앤 드롭"
```

---

### Task 18: 최초 설정 화면과 배포 준비

**Files:**
- Create: `herdr-plugin/src/ui/Setup.jsx`
- Create: `herdr-plugin/README.md`
- Modify: `herdr-plugin/src/cli.jsx`
- Modify: `herdr-plugin/herdr-plugin.toml` (액션 추가)
- Modify: `README.md` (저장소 최상위, 플러그인 안내 추가)

**Interfaces:**
- Consumes: `config.js` 의 `saveConfig`
- Produces: `<Setup onDone />` — URL 과 API Key 를 받아 저장한다

- [ ] **Step 1: 최초 설정 화면 구현**

설정이 없을 때 오류 문구만 띄우던 Task 9 의 처리를 실제 입력 화면으로 바꾼다.

```jsx
// herdr-plugin/src/ui/Setup.jsx
import { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { DEFAULT_API_URL, saveConfig } from '../config.js';

export function Setup({ onDone }) {
  const [field, setField] = useState(0);          // 0: URL, 1: 키
  const [url, setUrl] = useState(DEFAULT_API_URL);
  const [key, setKey] = useState('');

  useInput((input, k) => {
    if (k.tab) return setField(f => (f + 1) % 2);
    if (k.return) {
      if (!key.startsWith('ak_')) return;
      saveConfig({ apiUrl: url, keys: [{ label: '기본', key }], lastProjectId: null });
      return onDone();
    }
    if (k.backspace || k.delete) {
      return field === 0 ? setUrl(v => v.slice(0, -1)) : setKey(v => v.slice(0, -1));
    }
    if (input && !k.ctrl && !k.meta) {
      return field === 0 ? setUrl(v => v + input) : setKey(v => v + input);
    }
  });

  const valid = key.startsWith('ak_');

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="cyan" paddingX={2} paddingY={1}>
      <Text bold color="cyan">herdr-kanban 최초 설정</Text>
      <Text> </Text>
      <Text color="gray">칸반 웹의 프로젝트 설정에서 API Key 를 발급받아 붙여 넣으십시오.</Text>
      <Text> </Text>

      <Box>
        <Text color={field === 0 ? 'cyan' : 'gray'}>{field === 0 ? '> ' : '  '}</Text>
        <Box width={10}><Text color="gray">서버 주소</Text></Box>
        <Text bold={field === 0}>{url}</Text>
      </Box>

      <Box>
        <Text color={field === 1 ? 'cyan' : 'gray'}>{field === 1 ? '> ' : '  '}</Text>
        <Box width={10}><Text color="gray">API Key</Text></Box>
        <Text bold={field === 1}>
          {key ? `${key.slice(0, 6)}${'*'.repeat(Math.max(0, key.length - 6))}` : <Text color="gray">(ak_ 로 시작)</Text>}
        </Text>
      </Box>

      <Text> </Text>
      {valid
        ? <Text color="gray">Tab 항목 이동  Enter 저장</Text>
        : <Text color="yellow">API Key 는 ak_ 로 시작해야 합니다</Text>}
    </Box>
  );
}
```

`cli.jsx` 에서 키가 없으면 `<Setup>` 을 띄우고, 저장이 끝나면 설정을 다시 읽어 앱을 그린다.

- [ ] **Step 2: 매니페스트에 액션 추가**

pane 을 여는 액션을 두어 키보드 단축키로 호출할 수 있게 한다.
action id 는 플랫폼 간에도 전역 유일해야 하므로 Windows 변형에 접미사를 붙인다.

```toml
[[actions]]
id = "open-board"
platforms = ["linux", "macos"]
title = "칸반 열기"
description = "칸반 보드를 새 pane 으로 엽니다."
command = ["node", "./dist/cli.js", "--open"]

[[actions]]
id = "open-board-windows"
platforms = ["windows"]
title = "칸반 열기"
description = "칸반 보드를 새 pane 으로 엽니다."
command = ["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", '$r=$env:HERDR_PLUGIN_ROOT; if($r.StartsWith("\\?\")){$r=$r.Substring(4)}; node (Join-Path $r "dist\cli.js") --open']
```

`--open` 플래그를 받으면 앱을 그리지 않고 `herdr plugin pane open` 을 실행한 뒤 종료한다.

- [ ] **Step 3: 플러그인 README 작성**

설치·설정·키맵·문제 해결을 담는다. 최소한 다음을 포함한다.

- `herdr plugin install world-goes-to-hell/ysk-kanban/herdr-plugin`
- API Key 발급 위치 (칸반 웹의 프로젝트 설정)
- 키맵 표 (Task 15 의 `Help` 와 같은 내용)
- 단축키 등록 방법 (`config.toml` 의 `[[keys.command]]` 에 `herdr-kanban.open-board`)
- 마우스가 동작하지 않을 때 확인할 것 (`mouse_capture` 설정)
- 종료 후 터미널 마우스가 이상하면 `printf '\033[?1006l\033[?1002l\033[?1000l'`

- [ ] **Step 4: 저장소 README 갱신**

최상위 `README.md` 의 기능 목록에 Herdr 플러그인 항목을 더하고,
`mcp-server` 옆에 나란히 소개한다. MCP 는 에이전트용, 플러그인은 사람용이라는
구분을 한 줄로 밝힌다.

- [ ] **Step 5: 커버리지 확인**

Run: `cd herdr-plugin; npm run coverage`
Expected: 전체 80% 이상.
`layout.js`, `hit.js`, `mutations.js`, `mouse.js` 는 90% 이상이어야 한다.
모자라면 빠진 분기를 찾아 테스트를 더한다.

- [ ] **Step 6: 설계 문서의 검증 결과 반영**

`docs/plan/herdr-kanban-plugin.md` 의 "검증 계획" 표를 실제 결과로 채우고,
설계와 달라진 부분이 있으면 그 사유와 함께 적는다.

- [ ] **Step 7: 커밋**

```bash
git add herdr-plugin/ README.md docs/plan/herdr-kanban-plugin.md
git commit -m "feat(herdr-plugin): 최초 설정 화면과 배포 문서"
```

---

## 완료 조건

모든 태스크가 끝났을 때 다음이 모두 참이어야 한다.

- [ ] `herdr plugin install world-goes-to-hell/ysk-kanban/herdr-plugin` 으로 설치된다
- [ ] 설정이 없으면 최초 설정 화면이 뜨고, 키를 넣으면 보드가 그려진다
- [ ] 키보드로 탐색·생성·수정·삭제·댓글·상태 변경이 모두 된다
- [ ] 마우스로 클릭·더블클릭·휠·드래그 앤 드롭이 된다
- [ ] 프로젝트를 전환할 수 있고 마지막 선택이 기억된다
- [ ] 다른 창에서 일감을 바꾸면 화면이 따라 갱신된다
- [ ] 서버가 죽어 있을 때 조작하면 화면이 원래대로 돌아오고 오류가 보인다
- [ ] pane 폭을 좁히면 상세 패널이 접히고, 더 좁히면 목록 모드로 바뀐다
- [ ] 종료 후 터미널의 마우스와 화면이 정상이다
- [ ] `npm run coverage` 가 80% 이상을 보고한다

