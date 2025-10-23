#!/usr/bin/env node
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import process from "node:process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(__dirname, "../../../..");

const npmExecutable = process.platform === "win32" ? "npm.cmd" : "npm";
const nextExecutable = process.platform === "win32" ? "next.cmd" : "next";
const shouldStartOpenWebUI = (process.env.START_OPEN_WEBUI ?? "1") !== "0";
const shouldStopOpenWebUI = (process.env.STOP_OPEN_WEBUI_ON_EXIT ?? "1") !== "0";

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      ...options,
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} ${args.join(" ")} exited with code ${code}`));
      }
    });
  });
}

async function main() {
  let openWebUIStarted = false;

  if (shouldStartOpenWebUI) {
    try {
      await runCommand(npmExecutable, ["run", "openwebui:up"], { cwd: repoRoot });
      openWebUIStarted = true;
    } catch (error) {
      console.warn(
        "[miniapp] Unable to start Open WebUI via docker compose:",
        error?.message ?? error,
      );
      console.warn(
        "[miniapp] Continuing without launching Open WebUI. Set START_OPEN_WEBUI=0 to suppress this warning.",
      );
    }
  }

  const devEnv = {
    ...process.env,
    START_OPEN_WEBUI: shouldStartOpenWebUI ? "1" : "0",
  };

  const devProcess = spawn(nextExecutable, ["dev"], {
    cwd: appRoot,
    stdio: "inherit",
    env: devEnv,
  });

  const shutdownSignals = ["SIGINT", "SIGTERM"];
  let shuttingDown = false;

  const shutdown = (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    if (devProcess) {
      devProcess.kill(signal);
    }
  };

  for (const signal of shutdownSignals) {
    process.on(signal, () => shutdown(signal));
  }

  devProcess.on("exit", async (code) => {
    for (const signal of shutdownSignals) {
      process.removeAllListeners(signal);
    }

    if (openWebUIStarted && shouldStopOpenWebUI) {
      try {
        await runCommand(npmExecutable, ["run", "openwebui:down"], { cwd: repoRoot });
      } catch (error) {
        console.warn(
          "[miniapp] Failed to stop Open WebUI stack:",
          error?.message ?? error,
        );
      }
    }

    process.exitCode = code ?? 0;
  });
}

main().catch((error) => {
  console.error("[miniapp] Failed to start dev server:", error);
  process.exit(1);
});
