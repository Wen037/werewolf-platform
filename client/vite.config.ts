import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss()
  ],
  server: {
    port: 5173,
    strictPort: true, // fail fast instead of silently switching ports — keeps FRONTEND_URL/OAuth callback in sync
    proxy: {
      '/api': {
        target: 'http://localhost:5000', // Points to your Node Server
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
