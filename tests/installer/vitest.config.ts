import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

// Dedicated config for the installer suite. The ROOT vitest.config.ts excludes
// `tests/installer/**` so the bare `vitest run` (publish gate, local gate) stays
// fast + reliable — the installer E2E does a full source build + `npm i -g`
// (60-90s per case) and its reporter RPC intermittently times out in the shared
// worker pool. That exclude, however, also made `test:installer`
// (`vitest run tests/installer`) match ZERO files → "No test files found" → exit 1,
// which is why the dedicated installer-e2e.yml workflow went red. This config runs
// the installer suite WITHOUT that self-exclude so the dedicated workflow can
// actually exercise it. Used via `pnpm run test:installer` / installer-e2e.yml.
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // The installer tests shell out to a full build + global install; give the
    // reporter IPC and each case plenty of headroom so a slow runner is not a flake.
    teardownTimeout: 30000,
    testTimeout: 180000,
    hookTimeout: 180000,
    include: ['tests/installer/**/*.test.ts'],
    exclude: ['**/node_modules/**', 'node_modules', 'dist'],
  },
  resolve: {
    alias: {
      '@panguard-ai/core': resolve(__dirname, '../../packages/core/src'),
      '@panguard-ai/panguard-scan': resolve(__dirname, '../../packages/panguard-scan/src'),
      '@panguard-ai/panguard-guard': resolve(__dirname, '../../packages/panguard-guard/src'),
      '@panguard-ai/panguard-mcp': resolve(__dirname, '../../packages/panguard-mcp/src'),
      '@panguard-ai/panguard-skill-auditor': resolve(
        __dirname,
        '../../packages/panguard-skill-auditor/src'
      ),
    },
  },
});
