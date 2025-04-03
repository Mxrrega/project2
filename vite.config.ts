import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    proxy: {
      '/api/correios': {
        target: 'https://apps3.correios.com.br',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/correios/, '/areletronico/v1/ars/eventos'),
        secure: false,
      },
    },
  },
});