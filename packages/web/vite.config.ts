import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@openclaw/panguard-web': resolve(__dirname, '../panguard-web/src'),
    },
  },
});
