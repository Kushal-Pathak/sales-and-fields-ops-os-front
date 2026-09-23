import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/ — `test` is picked up by Vitest only.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
});
