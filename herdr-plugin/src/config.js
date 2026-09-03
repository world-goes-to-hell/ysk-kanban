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
