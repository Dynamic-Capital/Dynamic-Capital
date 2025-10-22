import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { componentTagger } from "lovable-tagger";

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    proxy: {
      "/": {
        target: "http://localhost:3000",
        changeOrigin: true,
        ws: true,
        secure: false,
        timeout: 30000,
        configure: (proxy) => {
          proxy.on("error", (err) => {
            console.log("🔴 Proxy error:", err.message);
          });
          proxy.on("proxyReq", (_proxyReq, req) => {
            console.log("➡️  Proxying:", req.method, req.url);
          });
          proxy.on("proxyRes", (proxyRes, req) => {
            console.log("✅ Response:", proxyRes.statusCode, req.url);
          });
        },
      },
    },
    hmr: {
      port: 8081,
    },
  },
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "apps/web"),
      "@shared": path.resolve(__dirname, "shared"),
      "~": path.resolve(__dirname, "src"),
      "next/font/google": path.resolve(__dirname, "src/stubs/next-font-google.ts"),
    },
  },
  envPrefix: ["VITE_", "NEXT_PUBLIC_"],
}));
