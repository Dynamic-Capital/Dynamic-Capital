#!/usr/bin/env node
import { spawnSync } from "node:child_process";

import deskTimeZoneConfig from "../../shared/time/desk-time-zone.json" assert {
  type: "json",
};

const FALLBACK_TIME_ZONE = "Indian/Maldives";
const FALLBACK_LABEL = "Malé, Maldives";
const FALLBACK_ABBREVIATION = "MVT";
const FALLBACK_OFFSET = "+05:00";

function coerceString(value) {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

const DESK_TIME_ZONE = coerceString(deskTimeZoneConfig?.iana) ??
  FALLBACK_TIME_ZONE;
const DESK_TIME_ZONE_LABEL = coerceString(deskTimeZoneConfig?.label) ??
  FALLBACK_LABEL;
const DESK_TIME_ZONE_ABBREVIATION =
  coerceString(deskTimeZoneConfig?.abbreviation) ?? FALLBACK_ABBREVIATION;
const DESK_TIME_ZONE_OFFSET = coerceString(deskTimeZoneConfig?.offset) ??
  FALLBACK_OFFSET;

function formatOffset(offsetValue) {
  if (!offsetValue) {
    return undefined;
  }

  const hasSign = offsetValue.startsWith("+") || offsetValue.startsWith("-");
  const normalized = hasSign ? offsetValue : `+${offsetValue}`;

  return `UTC${normalized}`;
}

function describeDeskTimeZone() {
  const parts = [DESK_TIME_ZONE_LABEL];

  if (DESK_TIME_ZONE_ABBREVIATION) {
    parts.push(`(${DESK_TIME_ZONE_ABBREVIATION}`);
  }

  const formattedOffset = formatOffset(DESK_TIME_ZONE_OFFSET);

  if (formattedOffset) {
    if (DESK_TIME_ZONE_ABBREVIATION) {
      const lastIndex = parts.length - 1;
      parts[lastIndex] = `${parts[lastIndex]}, ${formattedOffset})`;
    } else {
      parts.push(`(${formattedOffset})`);
    }
  } else if (DESK_TIME_ZONE_ABBREVIATION) {
    const lastIndex = parts.length - 1;
    parts[lastIndex] = `${parts[lastIndex]})`;
  }

  return parts.join(" ");
}

function normalizeLogger(logger = console) {
  const fallback = {
    info: console.info.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
    debug: console.debug.bind(console),
  };

  if (!logger) {
    return fallback;
  }

  return {
    info: typeof logger.info === "function"
      ? logger.info.bind(logger)
      : fallback.info,
    warn: typeof logger.warn === "function"
      ? logger.warn.bind(logger)
      : fallback.warn,
    error: typeof logger.error === "function"
      ? logger.error.bind(logger)
      : fallback.error,
    debug: typeof logger.debug === "function"
      ? logger.debug.bind(logger)
      : fallback.debug,
  };
}

export function syncDeskClock({ logger = console } = {}) {
  const { info, warn, debug } = normalizeLogger(logger);

  const steps = [
    {
      label: `Set system timezone to ${DESK_TIME_ZONE}`,
      command: "timedatectl",
      args: ["set-timezone", DESK_TIME_ZONE],
      required: true,
    },
    {
      label: "Trigger chrony immediate time sync",
      command: "chronyc",
      args: ["-a", "makestep"],
      required: false,
    },
  ];

  info(
    `🕒 Ensuring build environment clock is aligned with ${describeDeskTimeZone()}…`,
  );

  const requiredFailures = [];
  const optionalWarnings = [];
  let successfulSteps = 0;

  for (const step of steps) {
    info(`↪ ${step.label}`);
    const result = spawnSync(step.command, step.args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });

    if (result.error) {
      const message = result.error.code === "ENOENT"
        ? `Command '${step.command}' is not available on this system.`
        : result.error.message ?? String(result.error);

      if (step.required) {
        requiredFailures.push(`${step.label}: ${message}`);
      } else {
        optionalWarnings.push(`${step.label}: ${message}`);
      }
      warn(`⚠️  ${step.label} skipped — ${message}`);
      continue;
    }

    if (result.status !== 0) {
      const stderr = result.stderr ? result.stderr.trim() : "";
      const detail = stderr.length > 0
        ? stderr
        : `Exited with status ${result.status}`;
      if (step.required) {
        requiredFailures.push(`${step.label}: ${detail}`);
      } else {
        optionalWarnings.push(`${step.label}: ${detail}`);
      }
      warn(`⚠️  ${step.label} did not complete successfully (${detail}).`);
      continue;
    }

    successfulSteps += 1;
    const stdout = result.stdout ? result.stdout.trim() : "";
    if (stdout.length > 0) {
      debug(stdout);
    }
  }

  const ok = requiredFailures.length === 0;

  if (ok) {
    info("✅ Desk time synchronization steps completed.");
  } else {
    warn(
      "⚠️  Desk time synchronization encountered required-step failures.",
    );
  }

  if (optionalWarnings.length > 0) {
    warn("ℹ️  Optional desk time sync steps reported warnings:");
    for (const message of optionalWarnings) {
      warn(`   • ${message}`);
    }
  }

  return {
    ok,
    successfulSteps,
    requiredFailures,
    optionalWarnings,
  };
}

export function syncMaldivesClock(options) {
  return syncDeskClock(options);
}

export default syncDeskClock;
