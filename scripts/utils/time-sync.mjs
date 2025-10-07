#!/usr/bin/env node
import { spawnSync } from "node:child_process";

import deskTimeZoneConfig from "../../shared/time/desk-time-zone.json" with {
  type: "json",
};

const SERVER_TIME_ZONE_METADATA = resolveServerTimeZoneMetadata();

const FALLBACK_TIME_ZONE = SERVER_TIME_ZONE_METADATA.timeZone;
const FALLBACK_LABEL = SERVER_TIME_ZONE_METADATA.label;
const FALLBACK_ABBREVIATION = SERVER_TIME_ZONE_METADATA.abbreviation;
const FALLBACK_OFFSET = SERVER_TIME_ZONE_METADATA.offset;

const CACHE_TTL_MS = 60_000;

const DISABLE_TIMEZONE_ENV_KEYS = [
  "DYNAMIC_TIME_SYNC_DISABLE_TIMEZONE_STEP",
  "DC_TIME_SYNC_DISABLE_TIMEZONE_STEP",
  "TIME_SYNC_DISABLE_TIMEZONE_STEP",
];

function coerceBooleanEnv(value) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();

  if (normalized.length === 0) {
    return undefined;
  }

  if (["1", "true", "yes", "y", "on"].includes(normalized)) {
    return true;
  }

  if (["0", "false", "no", "n", "off"].includes(normalized)) {
    return false;
  }

  return undefined;
}

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

let lastSuccessfulSyncCache;

function cloneOutcome(outcome, extras = {}) {
  return {
    ok: outcome.ok,
    successfulSteps: outcome.successfulSteps,
    requiredFailures: [...outcome.requiredFailures],
    optionalWarnings: [...outcome.optionalWarnings],
    ...extras,
  };
}

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

function getProcessTimeZone() {
  const tzEnv = coerceString(process.env.TZ);
  if (tzEnv) {
    return tzEnv;
  }

  try {
    const formatter = new Intl.DateTimeFormat();
    const options = formatter.resolvedOptions?.();
    const intlTimeZone = coerceString(options?.timeZone ?? options?.timezone);
    return intlTimeZone;
  } catch (_err) {
    return undefined;
  }
}

function resolveServerTimeZoneMetadata() {
  const timeZone = coerceString(getProcessTimeZone()) ?? "UTC";

  let label;
  let abbreviation;
  let offset;

  try {
    const now = new Date();

    const longOffsetFormatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      timeZoneName: "longOffset",
      hour: "2-digit",
      minute: "2-digit",
    });

    const offsetPart = longOffsetFormatter
      .formatToParts(now)
      .find((part) => part.type === "timeZoneName");

    const offsetMatch = offsetPart?.value.match(/([+-]\d{2})(?::?(\d{2}))?/);

    if (offsetMatch) {
      const hours = offsetMatch[1];
      const minutes = offsetMatch[2] ?? "00";
      offset = `${hours}:${minutes}`;
    }

    const shortFormatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      timeZoneName: "short",
      hour: "2-digit",
    });

    const abbreviationPart = shortFormatter
      .formatToParts(now)
      .find((part) => part.type === "timeZoneName");

    if (abbreviationPart) {
      const normalized = abbreviationPart.value.replace(/GMT|UTC/gi, "").trim();
      if (normalized.length > 0) {
        abbreviation = normalized;
      }
    }
  } catch (_error) {
    // Ignore Intl failures and fall back to generic labels.
  }

  if (timeZone === "UTC") {
    offset ??= "+00:00";
    abbreviation ??= "UTC";
  }

  if (!label) {
    label = timeZone === "UTC"
      ? "Coordinated Universal Time"
      : `Server (${timeZone})`;
  }

  return {
    timeZone,
    label,
    abbreviation,
    offset,
  };
}

function hasTimezonePrivileges() {
  if (process.platform !== "linux") {
    return false;
  }

  if (typeof process.getuid !== "function") {
    return false;
  }

  try {
    return process.getuid() === 0;
  } catch (_err) {
    return false;
  }
}

function resolveDisableTimezoneOverride() {
  for (const key of DISABLE_TIMEZONE_ENV_KEYS) {
    const raw = process.env[key];
    const parsed = coerceBooleanEnv(raw);
    if (parsed === true) {
      return key;
    }
  }

  return undefined;
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

  const disableTimezoneSource = resolveDisableTimezoneOverride();
  const disableTimezoneStep = disableTimezoneSource !== undefined;
  const currentTimeZone = coerceString(getProcessTimeZone());
  const normalizedCurrentZone = currentTimeZone?.toLowerCase();
  const normalizedDeskZone = DESK_TIME_ZONE.toLowerCase();
  const timezoneMatches = normalizedCurrentZone &&
    normalizedCurrentZone === normalizedDeskZone;
  const timezonePrivileges = hasTimezonePrivileges();

  const steps = [];

  if (disableTimezoneStep) {
    info(
      `⏭️  Skipping system timezone adjustment because ${disableTimezoneSource} is set to a truthy value.`,
    );
  } else if (timezoneMatches) {
    info(
      `⏱️  System timezone already aligned with ${currentTimeZone}; skipping manual adjustment.`,
    );
  } else if (!timezonePrivileges) {
    info(
      "ℹ️  Skipping system timezone adjustment because the environment lacks permission to modify /etc/localtime. Set DYNAMIC_TIME_SYNC_DISABLE_TIMEZONE_STEP=true once the host clock is managed externally to silence this note.",
    );
  } else {
    steps.push({
      label: `Set system timezone to ${DESK_TIME_ZONE}`,
      command: "timedatectl",
      args: ["set-timezone", DESK_TIME_ZONE],
      required: true,
    });
  }

  steps.push({
    label: "Trigger chrony immediate time sync",
    command: "chronyc",
    args: ["-a", "makestep"],
    required: false,
  });

  const cacheKey = JSON.stringify({
    disableTimezoneStep,
    timezoneMatches: Boolean(timezoneMatches),
    timezonePrivileges,
    stepSignature: steps.map((step) =>
      `${step.command}:${step.args.join("\u0001")}`
    ).join("|"),
  });

  if (
    lastSuccessfulSyncCache && lastSuccessfulSyncCache.cacheKey === cacheKey
  ) {
    const ageMs = Date.now() - lastSuccessfulSyncCache.timestamp;
    if (ageMs <= CACHE_TTL_MS) {
      info(
        "♻️  Desk time synchronization already completed for this process; reusing cached outcome.",
      );
      return cloneOutcome(lastSuccessfulSyncCache.outcome);
    }
  }

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
    lastSuccessfulSyncCache = {
      cacheKey,
      timestamp: Date.now(),
      outcome: cloneOutcome({
        ok,
        successfulSteps,
        requiredFailures,
        optionalWarnings,
      }),
    };
  } else {
    warn(
      "⚠️  Desk time synchronization encountered required-step failures.",
    );
    lastSuccessfulSyncCache = undefined;
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
