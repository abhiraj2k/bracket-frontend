import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@et/api': path.resolve(__dirname, '../../packages/api/src/index.ts'),
      '@et/store': path.resolve(__dirname, '../../packages/store/src/index.ts'),
      '@et/utils': path.resolve(__dirname, '../../packages/utils/src/index.ts'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },
});
