import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  // GitHub Pages project site: https://avinashpeyyety.github.io/global-security-pulse/
  base: '/global-security-pulse/',
  plugins: [react()],
  resolve: {
    alias: {
      '@gsp/shared': path.resolve(__dirname, '../../packages/shared/src'),
    },
  },
  server: {
    port: 5173,
    host: true,
  },
});
