import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: { provider: 'v8', include: ['src/domain/**/*.js', 'src/application/**/*.js'] },
    projects: ['unit', 'e2e', 'integration'].map((name) => ({
      test: {
        name,
        include: [`src/tests/${name}/**/*.test.js`],
        testTimeout: 20000,
        hookTimeout: 30000,
        fileParallelism: name !== 'integration',
      },
    })),
  },
});
