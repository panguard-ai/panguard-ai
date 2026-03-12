import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/types.ts',
        '**/*.d.ts',
      ],
      thresholds: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80,
      },
    },
  },
  resolve: {
    alias: {
      '@panguard-ai/core': resolve(__dirname, '../../packages/core/src'),
      '@panguard-ai/panguard-scan': resolve(__dirname, '../../packages/panguard-scan/src'),
      '@panguard-ai/panguard-guard': resolve(__dirname, '../../packages/panguard-guard/src'),
      '@panguard-ai/panguard-skill-auditor': resolve(
        __dirname,
        '../../packages/panguard-skill-auditor/src'
      ),
    },
  },
});
