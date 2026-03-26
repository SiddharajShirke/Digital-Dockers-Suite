import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    https: {
      key: fs.readFileSync(path.resolve(__dirname, '../ssl/key.pem')),
      cert: fs.readFileSync(path.resolve(__dirname, '../ssl/cert.pem'))
    },
    proxy: {
      '/api': {
        target: 'https://localhost:5002',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
