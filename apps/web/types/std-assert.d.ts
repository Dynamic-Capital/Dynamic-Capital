declare module "std/assert/mod.ts" {
  export function assert(value: unknown, message?: string): asserts value;
  export function assertEquals<T>(
    actual: T,
    expected: T,
    message?: string,
  ): void;
  export function assertStrictEquals<T>(
    actual: T,
    expected: T,
    message?: string,
  ): void;
  export function assertThrows(
    fn: () => unknown,
    message?: string,
  ): unknown;
  export function assertFalse(value: unknown, message?: string): void;
  export function assertStringIncludes(
    actual: string,
    expected: string,
    message?: string,
  ): void;
}
