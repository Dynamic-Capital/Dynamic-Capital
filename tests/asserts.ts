export function assert(
  condition: unknown,
  message = "Assertion failed",
): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function formatValue(value: unknown): string {
  return typeof value === "string" ? `"${value}"` : String(value);
}

export function assertEquals<T>(
  actual: T,
  expected: T,
  message?: string,
): void {
  if (!Object.is(actual, expected)) {
    const details = `Expected ${formatValue(actual)} to strictly equal ${
      formatValue(expected)
    }`;
    throw new Error(message ? `${message}: ${details}` : details);
  }
}

export function assertExists<T>(
  value: T,
  message = "Expected value to be defined",
): asserts value is NonNullable<T> {
  if (value === null || value === undefined) {
    throw new Error(message);
  }
}

export function assertGreater(
  actual: number,
  expected: number,
  message?: string,
): void {
  if (!(actual > expected)) {
    const details = `Expected ${actual} to be greater than ${expected}`;
    throw new Error(message ? `${message}: ${details}` : details);
  }
}

export function assertAlmostEquals(
  actual: number,
  expected: number,
  epsilon = 1e-6,
  message?: string,
): void {
  if (!Number.isFinite(actual) || !Number.isFinite(expected)) {
    throw new TypeError("assertAlmostEquals requires finite numbers");
  }
  if (Math.abs(actual - expected) > epsilon) {
    const details =
      `Expected ${actual} to be within ±${epsilon} of ${expected}`;
    throw new Error(message ? `${message}: ${details}` : details);
  }
}
