#!/usr/bin/env node
import { spawn } from "node:child_process";

const PHASES = [
  { id: "phase1", label: "Phase 1 – Foundations" },
  { id: "phase2", label: "Phase 2 – Memory & Retrieval" },
  { id: "phase3", label: "Phase 3 – Procedures & Routing" },
  { id: "phase4", label: "Phase 4 – Ops & Governance" },
];

const PHASE_LOOKUP = new Map(PHASES.map((phase) => [phase.id, phase]));
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

function printUsage() {
  console.log(`Dynamic AI phased build`);
  console.log(`\nUsage:`);
  console.log(`  npm run build:dynamic-ai [-- --phase <phaseId> ...]`);
  console.log(`  npm run build:dynamic-ai [-- --list]`);
  console.log(`  npm run build:dynamic-ai [-- --help]`);
  console.log(`\nOptions:`);
  console.log(
    `  -p, --phase <phaseId>  Run only the specified phase (may be repeated).`,
  );
  console.log(`  -l, --list             List available phases and exit.`);
  console.log(`  -h, --help             Show this message and exit.`);
}

function listPhases() {
  console.log("Available Dynamic AI build phases:\n");
  for (const phase of PHASES) {
    console.log(`• ${phase.id} – ${phase.label}`);
  }
}

function parseArgs(rawArgs) {
  const selectedPhaseIds = [];
  const unknownArgs = [];

  for (let i = 0; i < rawArgs.length; i += 1) {
    const arg = rawArgs[i];

    if (arg === "--help" || arg === "-h") {
      printUsage();
      process.exit(0);
    }

    if (arg === "--list" || arg === "-l") {
      listPhases();
      process.exit(0);
    }

    if (arg === "--phase" || arg === "-p") {
      const value = rawArgs[i + 1];

      if (!value || value.startsWith("-")) {
        throw new Error("Missing phase id after --phase");
      }

      selectedPhaseIds.push(value);
      i += 1;
      continue;
    }

    if (arg.startsWith("--phase=")) {
      const value = arg.slice("--phase=".length);

      if (!value) {
        throw new Error("Missing phase id in --phase option");
      }

      selectedPhaseIds.push(value);
      continue;
    }

    unknownArgs.push(arg);
  }

  return { selectedPhaseIds, unknownArgs };
}

function ensureValidPhases(phaseIds) {
  const normalizedPhaseIds = Array.from(new Set(phaseIds));
  const missing = normalizedPhaseIds.filter((phaseId) =>
    !PHASE_LOOKUP.has(phaseId)
  );

  if (missing.length > 0) {
    const missingList = missing.join(", ");
    const availableList = PHASES.map((phase) => phase.id).join(", ");
    throw new Error(
      `Unknown phase id(s): ${missingList}. Available phases: ${availableList}`,
    );
  }

  return normalizedPhaseIds.map((phaseId) => PHASE_LOOKUP.get(phaseId));
}

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
    const { selectedPhaseIds, unknownArgs } = parseArgs(process.argv.slice(2));

    if (unknownArgs.length > 0) {
      throw new Error(`Unknown option(s): ${unknownArgs.join(", ")}`);
    }

    const phasesToRun = selectedPhaseIds.length > 0
      ? ensureValidPhases(selectedPhaseIds)
      : PHASES;

    for (const phase of phasesToRun) {
      await runPhaseBuild(phase);
    }

    console.log("\nDynamic AI build phases completed successfully.");
  } catch (error) {
    console.error("\nDynamic AI phased build failed.");
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}

await main();
