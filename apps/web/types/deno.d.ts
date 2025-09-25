/// <reference lib="deno.ns" />
/// <reference lib="deno.unstable" />
/// <reference lib="dom" />

export {};

declare global {
  // Minimal Buffer declaration for libraries expecting Node's Buffer
  type Buffer = Uint8Array;
}
declare const Deno:
  | undefined
  | {
    env: {
      get(name: string): string | undefined;
    };
  };
