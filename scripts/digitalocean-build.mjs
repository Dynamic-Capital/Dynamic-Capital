#!/usr/bin/env node
import { spawn } from "node:child_process";
import {
  banner,
  celebrate,
  divider,
  error as logError,
  info,
  note,
  step,
  success,
  warn,
} from "./utils/friendly-logger.js";
import { applyBrandingEnvDefaults } from "./utils/branding-env.mjs";
import { createSanitizedNpmEnv } from "./utils/npm-env.mjs";

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

function run(command, args, options = {}) {
  const { env: providedEnv, ...rest } = options;
  const env = createSanitizedNpmEnv(providedEnv ?? {});
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      ...rest,
      env,
    });

    child.on("error", (error) => {
      reject(error);
    });

    child.on("close", (code, signal) => {
      if (signal) {
        resolve(1);
        return;
      }
      resolve(code ?? 0);
    });
  });
}

function isMissing(value) {
  if (!value) {
    return true;
  }
  if (typeof value === "string" && value.trim() === "") {
    return true;
  }
  return false;
}

async function main() {
  const {
    defaultedKeys,
    resolvedOrigin,
  } = applyBrandingEnvDefaults({ includeSupabasePlaceholders: false });

  banner(
    "Dynamic Build Suite · DigitalOcean Deploy",
    "Preparing production bundles with branded defaults.",
  );

  if (defaultedKeys.length > 0) {
    note("Applied fallback branding environment variables for this build.", {
      details: defaultedKeys,
    });
  } else {
    info(`Branding environment already configured for ${resolvedOrigin}.`);
  }

  divider();
  step("Running workspace build tasks...");
  const buildCode = await run(npmCommand, ["run", "build"]);
  if (buildCode !== 0) {
    logError("`npm run build` failed. Aborting DigitalOcean deployment run.");
    process.exit(buildCode);
  }
  success("Workspace build completed.");

  const requiredKeys = ["CDN_BUCKET", "CDN_ACCESS_KEY", "CDN_SECRET_KEY"];
  const missingKeys = requiredKeys.filter((key) => isMissing(process.env[key]));

  if (missingKeys.length > 0) {
    divider();
    warn(
      "Skipping static asset upload because Spaces credentials are not fully configured.",
      { details: missingKeys },
    );
    note(
      "Set CDN_BUCKET, CDN_ACCESS_KEY, and CDN_SECRET_KEY to enable uploads during the build.",
    );
    return;
  }

  divider();
  step("Uploading `_static/` assets to DigitalOcean Spaces...");
  const uploadCode = await run(npmCommand, ["run", "upload-assets"]);
  if (uploadCode !== 0) {
    logError("`npm run upload-assets` failed.", {
      details: ["Assets were not uploaded to Spaces."],
    });
    process.exit(uploadCode);
  }

  success("Static asset upload completed.");
  celebrate("DigitalOcean build pipeline finished without issues.");
}

main().catch((error) => {
  logError("DigitalOcean build encountered an unexpected error.", {
    details: error?.message ? [error.message] : undefined,
  });
  process.exit(1);
});
