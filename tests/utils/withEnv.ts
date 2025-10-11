const hasProcessEnv = typeof process !== "undefined" && !!process.env;

function applyEnv(overrides: Record<string, string | undefined>): Map<string, string | undefined> {
  const previous = new Map<string, string | undefined>();
  if (!hasProcessEnv) {
    return previous;
  }
  for (const [key, value] of Object.entries(overrides)) {
    previous.set(key, process.env[key]);
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
  return previous;
}

function restoreEnv(previous: Map<string, string | undefined>): void {
  if (!hasProcessEnv) {
    return;
  }
  for (const [key, value] of previous.entries()) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}

export async function withEnv<T>(
  overrides: Record<string, string | undefined>,
  run: () => Promise<T> | T,
): Promise<T> {
  const previous = applyEnv(overrides);
  try {
    return await run();
  } finally {
    restoreEnv(previous);
  }
}
