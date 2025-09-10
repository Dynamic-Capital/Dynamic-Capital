// Allow running in both Node and Deno environments
declare const Deno:
  | { env?: { get(name: string): string | undefined } }
  | undefined;
declare const process:
  | { env?: Record<string, string | undefined> }
  | undefined;

function getEnv(name: string): string | undefined {
  if (typeof process !== 'undefined' && process.env) {
    return process.env[name];
  }
  if (typeof Deno !== 'undefined' && typeof Deno.env?.get === 'function') {
    return Deno.env.get(name);
  }
  return undefined;
}

const isDev = getEnv('NODE_ENV') !== 'production';

const levels = ['error', 'warn', 'info', 'log'] as const;
type Level = (typeof levels)[number];

function getLevel(): Level {
  const envLevel = getEnv('LOG_LEVEL')?.toLowerCase() as Level | undefined;
  if (envLevel && levels.includes(envLevel)) return envLevel;
  return isDev ? 'log' : 'error';
}

const currentLevel = getLevel();

function shouldLog(level: Level) {
  return levels.indexOf(level) <= levels.indexOf(currentLevel);
}

export const logger = {
  log: (...args: unknown[]) => {
    if (shouldLog('log')) console.log(...args);
  },
  info: (...args: unknown[]) => {
    if (shouldLog('info')) console.info(...args);
  },
  warn: (...args: unknown[]) => {
    if (shouldLog('warn')) console.warn(...args);
  },
  error: (...args: unknown[]) => {
    console.error(...args);
  },
};

export default logger;
