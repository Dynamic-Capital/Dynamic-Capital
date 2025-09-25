declare module "@sentry/nextjs" {
  export interface InitOptions {
    [key: string]: unknown;
  }
  export function init(options?: InitOptions): void;
}
