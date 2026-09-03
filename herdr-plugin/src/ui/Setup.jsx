// herdr-plugin/src/ui/Setup.jsx
import { useRef, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { DEFAULT_API_URL, saveConfig } from '../config.js';

const KEY_PREFIX = 'ak_';
const SHOWN_CHARS = 6; // API Key 앞 몇 글자만 보이고 나머지는 가린다
const URL_FIELD = 0;
const KEY_FIELD = 1;

export function Setup({ onDone }) {
  const [form, setForm] = useState({ field: URL_FIELD, url: DEFAULT_API_URL, key: '' });

  /**
   * 입력값은 상자에도 함께 담는다. useInput 콜백은 직전 렌더의 값을 보기 때문에,
   * 키가 한 묶음으로 들어오면(붙여넣기 등) Tab 으로 옮긴 칸이 반영되기 전에 다음 글자가
   * 들어와 엉뚱한 칸에 쌓인다.
   */
  const ref = useRef(form);
  const update = (patch) => {
    ref.current = { ...ref.current, ...patch };
    setForm(ref.current);
  };

  useInput((input, k) => {
    const { field, url, key } = ref.current;

    if (k.tab) return update({ field: (field + 1) % 2 });

    if (k.return) {
      if (!key.startsWith(KEY_PREFIX)) return;
      saveConfig({ apiUrl: url, keys: [{ label: '기본', key }], lastProjectId: null });
      return onDone();
    }

    if (k.backspace || k.delete) {
      return field === URL_FIELD
        ? update({ url: url.slice(0, -1) })
        : update({ key: key.slice(0, -1) });
    }

    if (input && !k.ctrl && !k.meta) {
      return field === URL_FIELD
        ? update({ url: url + input })
        : update({ key: key + input });
    }
  });

  const valid = form.key.startsWith(KEY_PREFIX);
  const maskedKey = form.key
    ? form.key.slice(0, SHOWN_CHARS) + '*'.repeat(Math.max(0, form.key.length - SHOWN_CHARS))
    : null;

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="cyan" paddingX={2} paddingY={1}>
      <Text bold color="cyan">herdr-kanban 최초 설정</Text>
      <Text> </Text>
      <Text color="gray">칸반 웹의 프로젝트 설정에서 API Key 를 발급받아 붙여 넣으십시오.</Text>
      <Text> </Text>

      <Box>
        <Text color={form.field === URL_FIELD ? 'cyan' : 'gray'}>
          {form.field === URL_FIELD ? '> ' : '  '}
        </Text>
        <Box width={10}><Text color="gray">서버 주소</Text></Box>
        <Text bold={form.field === URL_FIELD}>{form.url}</Text>
      </Box>

      <Box>
        <Text color={form.field === KEY_FIELD ? 'cyan' : 'gray'}>
          {form.field === KEY_FIELD ? '> ' : '  '}
        </Text>
        <Box width={10}><Text color="gray">API Key</Text></Box>
        {maskedKey
          ? <Text bold={form.field === KEY_FIELD}>{maskedKey}</Text>
          : <Text color="gray">(ak_ 로 시작)</Text>}
      </Box>

      <Text> </Text>
      {valid
        ? <Text color="gray">Tab 항목 이동  Enter 저장</Text>
        : <Text color="yellow">API Key 는 ak_ 로 시작해야 합니다</Text>}
    </Box>
  );
}
