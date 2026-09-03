// herdr-plugin/vitest.config.js
export default {
  // Vitest 4 는 esbuild 가 아니라 oxc 로 변환하므로 여기에 jsx 설정을 둔다.
  oxc: { jsx: { runtime: 'automatic' } },
  test: {
    include: ['test/**/*.test.{js,jsx}'],
    coverage: { provider: 'v8', reporter: ['text', 'json-summary'] },
  },
};
