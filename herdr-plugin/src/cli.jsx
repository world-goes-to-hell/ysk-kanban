#!/usr/bin/env node
// herdr-plugin/src/cli.jsx
import { execFileSync } from 'node:child_process';
import { render } from 'ink';
import { loadConfig } from './config.js';
import { createClient } from './api/client.js';
import { createStore } from './store.js';
import { App } from './ui/App.jsx';
import { Setup } from './ui/Setup.jsx';

// 매니페스트의 [[panes]] id 는 플랫폼마다 다르다.
const ENTRYPOINT = process.platform === 'win32' ? 'board' : 'board-unix';
const OPEN_TIMEOUT_MS = 10000;

/** --open 으로 불렸을 때. 앱을 그리지 않고 herdr 에 pane 을 열어 달라고 하고 끝낸다. */
function openPane() {
  try {
    execFileSync('herdr',
      ['plugin', 'pane', 'open', '--plugin', 'herdr-kanban', '--entrypoint', ENTRYPOINT],
      { stdio: 'ignore', timeout: OPEN_TIMEOUT_MS, windowsHide: true });
  } catch {
    console.error('pane 을 열지 못했습니다. Herdr 안에서 실행하고 있는지 확인해 주십시오.');
    process.exitCode = 1;
  }
}

/** 보드를 띄운다. 첫 화면이 비어 보이지 않도록 데이터를 먼저 받아 둔다. */
async function start(cfg) {
  const client = createClient({ apiUrl: cfg.apiUrl, apiKey: cfg.keys[0].key });
  const store = createStore({ client, initialProjectId: cfg.lastProjectId });

  await store.loadProjects();
  const projectId = cfg.lastProjectId ?? store.getState().projects[0]?.id;
  if (projectId) await store.loadBoard(projectId);

  render(
    <App store={store} client={client} apiUrl={cfg.apiUrl} apiKey={cfg.keys[0].key} />,
    { alternateScreen: true, exitOnCtrlC: true },
  );
}

const cfg = loadConfig();

if (process.argv.includes('--open')) {
  openPane();
} else if (cfg.keys.length === 0) {
  // 설정이 없으면 안내만 하고 끝내지 않는다. 그 자리에서 받아 저장하고 바로 보드로 넘어간다.
  const setup = render(<Setup onDone={() => { setup.unmount(); void start(loadConfig()); }} />);
} else {
  await start(cfg);
}
