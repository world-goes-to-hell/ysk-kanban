import { describe, it, expect, vi, beforeAll } from 'vitest';
import { mkdtempSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { render } from 'ink-testing-library';

// 실제 설정 파일을 건드리지 않도록, config.js 를 읽기 전에 저장 위치를 임시 폴더로 돌린다.
let dir;
beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), 'herdr-kanban-setup-'));
  process.env.HERDR_PLUGIN_CONFIG_DIR = dir;
});

const { Setup } = await import('../src/ui/Setup.jsx');
const { DEFAULT_API_URL } = await import('../src/config.js');

/** Ink 가 입력을 처리할 틈을 준다. */
const settle = () => new Promise(r => setTimeout(r, 20));

describe('Setup', () => {
  it('서버 주소 기본값을 보여준다', () => {
    const { lastFrame } = render(<Setup onDone={() => {}} />);
    expect(lastFrame()).toContain(DEFAULT_API_URL);
  });

  it('키가 비어 있으면 ak_ 로 시작하라고 알린다', () => {
    const { lastFrame } = render(<Setup onDone={() => {}} />);
    expect(lastFrame()).toContain('ak_ 로 시작해야 합니다');
  });

  it('올바르지 않은 키로 Enter 를 눌러도 저장하지 않는다', async () => {
    const onDone = vi.fn();
    const { stdin } = render(<Setup onDone={onDone} />);

    stdin.write('\t');       // API Key 칸으로 이동
    stdin.write('wrong');
    stdin.write('\r');
    await settle();

    expect(onDone).not.toHaveBeenCalled();
  });

  it('ak_ 로 시작하는 키를 넣으면 저장하고 끝낸다', async () => {
    const onDone = vi.fn();
    const { stdin, lastFrame } = render(<Setup onDone={onDone} />);

    stdin.write('\t');
    stdin.write('ak_test123');
    await settle();

    // 앞 여섯 글자만 보이고 나머지는 가려진다
    expect(lastFrame()).toContain('ak_tes');
    expect(lastFrame()).not.toContain('ak_test123');
    expect(lastFrame()).toContain('Enter 저장');

    stdin.write('\r');
    await settle();

    expect(onDone).toHaveBeenCalledTimes(1);

    const saved = JSON.parse(readFileSync(join(dir, 'config.json'), 'utf8'));
    expect(saved.apiUrl).toBe(DEFAULT_API_URL);
    expect(saved.keys).toEqual([{ label: '기본', key: 'ak_test123' }]);
    expect(saved.lastProjectId).toBeNull();
  });
});
