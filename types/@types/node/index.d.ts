declare var process: {
  env: Record<string, string | undefined>;
};

declare module "node:test" {
  const test: (...args: any[]) => any;
  export default test;
}

declare module "node:assert/strict" {
  const assert: any;
  export default assert;
}
