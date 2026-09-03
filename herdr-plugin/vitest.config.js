// herdr-plugin/vitest.config.js
export default {
  test: {
    include: ['test/**/*.test.js'],
    coverage: { provider: 'v8', reporter: ['text', 'json-summary'] },
  },
};
