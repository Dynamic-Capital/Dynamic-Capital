import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { resolve } from "path";

const BUILD_TARGET = "es2020";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
  esbuild: {
    target: BUILD_TARGET,
    drop: ["console", "debugger"],
    legalComments: "none",
  },
  optimizeDeps: {
    include: ["react", "react-dom", "react-router-dom"],
    esbuildOptions: {
      target: BUILD_TARGET,
    },
  },
  build: {
    target: BUILD_TARGET,
    minify: "esbuild",
    outDir: "./static",
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
  css: {
    postcss: "./postcss.config.js",
  },
  base: "./",
});
