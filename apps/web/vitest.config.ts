import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dirname = path.dirname(fileURLToPath(import.meta.url));

const config = {
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(dirname, "./"),
    },
  },
  test: {
    include: [
      "components/**/*.test.tsx",
      "hooks/**/*.test.tsx",
      "services/**/*.test.ts",
    ],
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.tsx"],
  },
};

export default config;
