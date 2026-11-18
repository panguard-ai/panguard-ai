import { defineConfig } from 'vitest/config';
import path from 'path';

/**
 * Node-only config for the outward-figure guards, so CI can run them without the
 * jsdom setup the component tests need. The root vitest run excludes this package.
 */
export default defineConfig({
  test: {
    include: ['tests/lib/message-tokens.test.ts', 'tests/data/outward-figures.test.ts'],
    environment: 'node',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
