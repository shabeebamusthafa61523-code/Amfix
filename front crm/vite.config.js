import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    chunkSizeWarningLimit: 4000
  },
  server: {
    proxy: {
      '/api': {

        // target: 'https://crm-test-yy77.onrender.com', // Points directly to your Express backend server
        target: 'http://localhost:5000', // Points directly to your Express backend server

        changeOrigin: true,
        secure: false,
      },
    },
  },
});
