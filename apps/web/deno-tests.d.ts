declare module "https://deno.land/std@0.224.0/assert/mod.ts" {
  export function assert(condition: unknown, message?: string): asserts condition;
  export function assertEquals<T>(actual: T, expected: T, message?: string): void;
  export function assertMatch(actual: string, expected: RegExp, message?: string): void;
  export function assertStringIncludes(actual: string, expected: string, message?: string): void;
}

declare module "https://esm.sh/jsdom@22.1.0" {
  export class JSDOM {
    constructor(html?: string, options?: Record<string, unknown>);
    window: Window & typeof globalThis;
    serialize(): string;
  }
}

declare module "https://esm.sh/react@18.2.0" {
  export * from "react";
  export { default } from "react";
}

declare module "https://esm.sh/@testing-library/react@14.2.1" {
  import type {
    cleanup as rtlCleanup,
    render as rtlRender,
    screen as rtlScreen,
    waitFor as rtlWaitFor,
  } from "@testing-library/react";

  export const cleanup: typeof rtlCleanup;
  export const render: typeof rtlRender;
  export const screen: typeof rtlScreen;
  export const waitFor: typeof rtlWaitFor;
}

declare const deno: {
  test: (name: string, fn: () => Promise<void> | void) => void;
};
