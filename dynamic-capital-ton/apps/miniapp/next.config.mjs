import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    externalDir: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  webpack(config) {
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      "@": path.resolve(__dirname, "./src"),
      "@shared": path.resolve(__dirname, "../../../shared"),
    };
    config.resolve.fallback = {
      ...(config.resolve.fallback ?? {}),
      encoding: false,
    };
    return config;
  },
};

export default nextConfig;
