import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  envDir: './env',
  define: {
    global: 'globalThis',
  },
  resolve: {
    alias: {
      // Provide a browser-compatible polyfill for ws module
      ws: '/src/polyfills/ws.js',
    },
  },
  optimizeDeps: {
    exclude: ['ws', '@supabase/realtime-js'],
  },
  server: {
    fs: {
      allow: ['..'],
    },
    proxy: {
      '/api/bitjita-proxy': {
        target: 'https://bitjita.com',
        changeOrigin: true,
        secure: true,
        timeout: 30000, // 30 second timeout
        proxyTimeout: 30000,
        rewrite: (path) => {
          // Extract endpoint parameter from the path
          const url = new URL(path, 'http://localhost');
          const endpoint = url.searchParams.get('endpoint');

          if (endpoint) {
            const newPath = `/api/${endpoint}`;
            console.log(`[Proxy] Rewriting ${path} to ${newPath}`);
            return newPath;
          }

          // Fallback to simple rewrite
          return path.replace(/^\/api\/bitjita-proxy/, '/api');
        },
        headers: {
          Accept: 'application/json',
          'User-Agent': 'SettlementInventoryManager/1.0',
          Connection: 'keep-alive',
        },
        configure: (proxy) => {
          proxy.on('error', (err, _req, res) => {
            console.error('[Proxy Error]', err.message);
            if (res && !res.headersSent && typeof res.writeHead === 'function') {
              res.writeHead(502, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Proxy error', message: err.message }));
            }
          });
          proxy.on('proxyReq', (proxyReq) => {
            // Keep connection alive
            proxyReq.setHeader('Connection', 'keep-alive');
          });
        },
      },
      // Note: scrape-settlement and scrape-status endpoints would need
      // to be implemented in your backend server or as Vite middleware
      // For now, they'll need to be handled by your actual backend
    },
  },
});
