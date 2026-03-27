import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        // Backend runs as HTTPS in backend/server.js; keep this in sync with PORT.
        target: process.env.VITE_API_PROXY_TARGET || 'https://localhost:5002',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
