#!/usr/bin/env node
import { spawn } from "node:child_process";

const PHASES = [
  { id: "phase1", label: "Phase 1 – Foundations" },
  { id: "phase2", label: "Phase 2 – Memory & Retrieval" },
  { id: "phase3", label: "Phase 3 – Procedures & Routing" },
  { id: "phase4", label: "Phase 4 – Ops & Governance" },
];

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

function runPhaseBuild(phase) {
  return new Promise((resolve, reject) => {
    console.log(`\n=== Dynamic AI ${phase.label}: starting build ===`);

    const child = spawn(
      npmCommand,
      ["run", "build"],
      {
        stdio: "inherit",
        env: {
          ...process.env,
          DYNAMIC_AI_PHASE: phase.id,
        },
      },
    );

    child.on("error", (error) => {
      reject(error);
    });

    child.on("exit", (code, signal) => {
      if (signal) {
        reject(new Error(`Build interrupted by signal ${signal}`));
        return;
      }

      if (code !== 0) {
        reject(new Error(`npm run build exited with code ${code}`));
        return;
      }

      console.log(`=== Dynamic AI ${phase.label}: build complete ===`);
      resolve();
    });
  });
}

async function main() {
  try {
    for (const phase of PHASES) {
      await runPhaseBuild(phase);
    }

    console.log("\nAll Dynamic AI build phases completed successfully.");
  } catch (error) {
    console.error("\nDynamic AI phased build failed.");
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}

await main();
