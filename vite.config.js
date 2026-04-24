import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      parchment: path.resolve('./node_modules/parchment'),
    },
  },
  optimizeDeps: {
    include: ['quill', 'turndown', 'turndown-plugin-gfm', 'marked', 'jszip'],
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    assetsInlineLimit: 0,
  },
});
