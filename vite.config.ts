import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

export default defineConfig({
  plugins: [react()],
  // Local counter: `node deploy/stats-server.mjs` (port 3001) answers /api/presence like in production.
  server: { proxy: { '/api': `http://127.0.0.1:${process.env.STATS_PORT ?? 3001}` } },
  preview: { proxy: { '/api': `http://127.0.0.1:${process.env.STATS_PORT ?? 3001}` } },
});
