import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'apps/web')
    }
  },
  server: {
    port: 8080
  },
  build: {
    rollupOptions: {
      input: './index.html'
    }
  }
})
