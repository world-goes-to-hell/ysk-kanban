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

  render(
    <App store={store} client={client} apiUrl={cfg.apiUrl} apiKey={cfg.keys[0].key} />,
    { alternateScreen: true, exitOnCtrlC: true },
  );
}
