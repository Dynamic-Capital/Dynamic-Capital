import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { componentTagger } from "lovable-tagger";

// Proxy configuration to forward to Next.js app
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    proxy: {
      // Forward all requests to Next.js app running on port 3000
      "/": {
        target: "http://localhost:3000",
        changeOrigin: true,
        ws: true,
        secure: false,
        timeout: 30000,
        configure: (proxy, _options) => {
          proxy.on("error", (err, _req, _res) => {
            console.log("🔴 Proxy error:", err.message);
          });
          proxy.on("proxyReq", (_proxyReq, req, _res) => {
            console.log("➡️  Proxying:", req.method, req.url);
          });
          proxy.on("proxyRes", (proxyRes, req, _res) => {
            console.log("✅ Response:", proxyRes.statusCode, req.url);
          });
        },
      },
    },
    // Enable Hot Module Replacement for better dev experience
    hmr: {
      port: 8081,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "apps/web"),
      "~": path.resolve(__dirname, "src"),
      "next/font/google": path.resolve(
        __dirname,
        "src/stubs/next-font-google.ts",
      ),
    },
  },
  envPrefix: ["VITE_", "NEXT_PUBLIC_"],
}));
