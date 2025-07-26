import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  envDir: './env',
  define: {
    global: 'globalThis',
  },
  server: {
    fs: {
      allow: ['..'],
    },
    proxy: {
      '/api/bitjita-proxy': {
        target: 'https://bitjita.com',
        changeOrigin: true,
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
        },
      },
      // Note: scrape-settlement and scrape-status endpoints would need
      // to be implemented in your backend server or as Vite middleware
      // For now, they'll need to be handled by your actual backend
    },
  },
});
