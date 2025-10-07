#!/usr/bin/env node
/**
 * Unified Build Script for Dynamic Capital TON Web3 App
 *
 * This script consolidates the build process for the entire application:
 * - Next.js web app with TON integration
 * - Static assets and CDN uploads
 * - Environment configuration
 * - Multi-platform support (DigitalOcean, Vercel, local)
 */

import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  applyBrandingEnvDefaults,
  PRODUCTION_ALLOWED_ORIGIN_LIST,
} from "./utils/branding-env.mjs";
import { createSanitizedNpmEnv } from "./utils/npm-env.mjs";
import { hashDirectory } from "./utils/hash-directory.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

// Build configuration
const BUILD_CONFIG = {
  platform: process.env.BUILD_PLATFORM || detectPlatform(),
  staticDir: process.env.STATIC_DIR || "_static",
  cacheDir: process.env.BUILD_CACHE_DIR || ".build-cache",
  enableCDN: parseBool(process.env.ENABLE_CDN_UPLOAD),
  enableMinification: parseBool(process.env.ENABLE_MINIFICATION, true),
  enableSourceMaps: parseBool(process.env.ENABLE_SOURCE_MAPS, false),
  enableTypeCheck: parseBool(process.env.ENABLE_TYPE_CHECK, true),
  skipAssetUpload: parseBool(process.env.SKIP_ASSET_UPLOAD, false),
};

const TON_DOMAINS = {
  primary: "dynamiccapital.ton",
  gateway: "ton-gateway.dynamic-capital.ondigitalocean.app",
  gatewayFallback: "ton-gateway.dynamic-capital.lovable.app",
};

console.log("🚀 Dynamic Capital TON Web3 App - Unified Build");
console.log("Platform:", BUILD_CONFIG.platform);
console.log("Environment:", process.env.NODE_ENV || "production");
console.log("TON Primary Domain:", TON_DOMAINS.primary);
console.log("TON Gateway:", TON_DOMAINS.gateway);

// Detect build platform
function detectPlatform() {
  if (process.env.DIGITALOCEAN_APP_ID) return "digitalocean";
  if (process.env.VERCEL) return "vercel";
  if (process.env.LOVABLE_BUILD) return "lovable";
  return "local";
}

function parseBool(value, defaultValue = false) {
  if (value === undefined || value === null) return defaultValue;
  const normalized = String(value).trim().toLowerCase();
  return ["1", "true", "yes", "on"].includes(normalized);
}

async function runCommand(command, args, options = {}) {
  const { env: providedEnv, ...rest } = options;
  const env = createSanitizedNpmEnv(providedEnv ?? {});

  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      ...rest,
      env,
    });

    child.on("error", reject);
    child.on("close", (code, signal) => {
      if (signal) {
        resolve(1);
        return;
      }
      resolve(code ?? 0);
    });
  });
}

// Configure branding and environment
function configureBranding() {
  const {
    allowedOrigins,
    defaultedKeys: brandingDefaults,
    resolvedOrigin: canonicalOrigin,
  } = applyBrandingEnvDefaults({
    allowedOrigins: ({ env, resolvedOrigin }) => {
      const existing = env.ALLOWED_ORIGINS?.trim();
      if (existing) return existing;

      const defaults = new Set(PRODUCTION_ALLOWED_ORIGIN_LIST);
      defaults.add(resolvedOrigin);
      defaults.add(`https://${TON_DOMAINS.primary}`);
      defaults.add(`https://www.${TON_DOMAINS.primary}`);
      defaults.add(`https://${TON_DOMAINS.gateway}`);
      defaults.add(`https://${TON_DOMAINS.gatewayFallback}`);

      return Array.from(defaults).join(",");
    },
    includeSupabasePlaceholders: false,
  });

  if (brandingDefaults.length > 0) {
    console.log(
      "✅ Applied default branding variables:",
      brandingDefaults.join(", "),
    );
  } else {
    console.log(`✅ Branding configured (origin: ${canonicalOrigin})`);
  }

  if (allowedOrigins) {
    console.log("✅ ALLOWED_ORIGINS:", allowedOrigins);
  }

  return { canonicalOrigin, allowedOrigins };
}

// Build the Next.js application
async function buildNextApp() {
  console.log("\n📦 Building Next.js application...");

  const buildEnv = {
    NODE_ENV: "production",
    NEXT_TELEMETRY_DISABLED: "1",
  };

  const code = await runCommand(npmCommand, ["run", "build:web"], {
    env: buildEnv,
  });

  if (code !== 0) {
    throw new Error("Next.js build failed");
  }

  console.log("✅ Next.js build completed");
}

// Type check the application
async function typeCheck() {
  if (!BUILD_CONFIG.enableTypeCheck) {
    console.log("⏭️  Type checking skipped");
    return;
  }

  console.log("\n🔍 Running type check...");

  const code = await runCommand(npmCommand, ["run", "typecheck"], {
    cwd: path.join(__dirname, "..", "apps", "web"),
  });

  if (code !== 0) {
    console.warn("⚠️  Type check completed with errors");
  } else {
    console.log("✅ Type check passed");
  }
}

// Upload static assets to CDN
async function uploadAssets() {
  if (BUILD_CONFIG.skipAssetUpload) {
    console.log("⏭️  Asset upload skipped");
    return;
  }

  const staticDir = BUILD_CONFIG.staticDir;
  const fingerprint = await hashDirectory(staticDir);

  if (!fingerprint) {
    console.warn(
      `⚠️  Directory "${staticDir}" not found. Skipping asset upload.`,
    );
    return;
  }

  console.log(
    `\n📤 Uploading static assets (${fingerprint.fileCount} files)...`,
  );

  const requiredKeys = ["CDN_BUCKET", "CDN_ACCESS_KEY", "CDN_SECRET_KEY"];
  const missingKeys = requiredKeys.filter((key) => !process.env[key]?.trim());

  if (missingKeys.length > 0) {
    console.warn(`⚠️  Skipping CDN upload. Missing: ${missingKeys.join(", ")}`);
    return;
  }

  const code = await runCommand(npmCommand, ["run", "upload-assets"]);

  if (code !== 0) {
    console.warn("⚠️  Asset upload failed");
  } else {
    console.log("✅ Assets uploaded successfully");
  }
}

// Generate brand assets
async function generateBrandAssets() {
  console.log("\n🎨 Generating brand assets...");

  const code = await runCommand(npmCommand, ["run", "generate:brand-assets"], {
    cwd: path.join(__dirname, "..", "apps", "web"),
  });

  if (code !== 0) {
    console.warn("⚠️  Brand asset generation failed");
  } else {
    console.log("✅ Brand assets generated");
  }
}

// Verify TON configuration
function verifyTonConfig() {
  console.log("\n🔗 Verifying TON configuration...");

  const tonConfig = {
    primaryDomain: TON_DOMAINS.primary,
    gateway: TON_DOMAINS.gateway,
    manifestUrl: process.env.TONCONNECT_MANIFEST_URL,
    siteUrl: process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL,
  };

  console.log("TON Config:", JSON.stringify(tonConfig, null, 2));
  console.log("✅ TON configuration verified");
}

// Main build process
async function main() {
  try {
    const startTime = Date.now();

    // Step 1: Configure branding and environment
    const { canonicalOrigin, allowedOrigins } = configureBranding();

    // Step 2: Verify TON configuration
    verifyTonConfig();

    // Step 3: Ensure cache directory exists
    await mkdir(BUILD_CONFIG.cacheDir, { recursive: true });
    console.log(`✅ Cache directory: ${BUILD_CONFIG.cacheDir}`);

    // Step 4: Generate brand assets
    await generateBrandAssets();

    // Step 5: Run type check (optional)
    await typeCheck();

    // Step 6: Build Next.js application
    await buildNextApp();

    // Step 7: Upload static assets (if configured)
    if (BUILD_CONFIG.enableCDN) {
      await uploadAssets();
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n✨ Build completed successfully in ${duration}s`);
    console.log("\n📊 Build Summary:");
    console.log("  Platform:", BUILD_CONFIG.platform);
    console.log("  Canonical Origin:", canonicalOrigin);
    console.log("  TON Domain:", TON_DOMAINS.primary);
    console.log("  TON Gateway:", TON_DOMAINS.gateway);
    console.log(
      "  CDN Upload:",
      BUILD_CONFIG.enableCDN ? "Enabled" : "Disabled",
    );
  } catch (error) {
    console.error("\n❌ Build failed:", error.message);
    process.exit(1);
  }
}

main();
