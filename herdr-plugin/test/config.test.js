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
