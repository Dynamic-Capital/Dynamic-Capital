import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from 'path'

export default defineConfig(() => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: './dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
    // Define Supabase environment variables directly
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify('https://qeejuomcapbdlhnjqjcc.supabase.co'),
    'import.meta.env.VITE_SUPABASE_PROJECT_ID': JSON.stringify('qeejuomcapbdlhnjqjcc'),
    'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY': JSON.stringify('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFlZWp1b21jYXBiZGxobmpxamNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQyMDE4MTUsImV4cCI6MjA2OTc3NzgxNX0.GfK9Wwx0WX_GhDIz1sIQzNstyAQIF2Jd6p7t02G44zk'),
  },
  base: './',
}))