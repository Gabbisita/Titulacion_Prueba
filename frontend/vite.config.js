import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Reenvía /backend/* al servidor Express (puerto 5000).
    // Así funciona tanto en local como en Codespaces sin exponer el puerto 5000.
    proxy: {
      '/backend': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/backend/, '') || '/',
      },
    },
  },
})
