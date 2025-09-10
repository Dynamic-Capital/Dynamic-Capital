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

export const logger = {
  log: (...args: unknown[]) => {
    if (isDev) console.log(...args);
  },
  info: (...args: unknown[]) => {
    if (isDev) console.info(...args);
  },
  warn: (...args: unknown[]) => {
    if (isDev) console.warn(...args);
  },
  error: (...args: unknown[]) => {
    if (isDev) console.error(...args);
  },
};

export default logger;
