export interface TonSourceConfiguration {
  readonly backends: readonly string[];
  readonly backendsTestnet: readonly string[];
  readonly funcVersions: readonly string[];
  readonly tactVersions: readonly string[];
  readonly tolkVersions: readonly string[];
}

const TON_SOURCE_CONFIGURATION = Object.freeze({
  backends: Object.freeze(
    [
      "https://ton-source-prod-1.herokuapp.com",
      "https://ton-source-prod-2.herokuapp.com",
      "https://ton-source-prod-3.herokuapp.com",
    ] as const,
  ),
  backendsTestnet: Object.freeze(
    [
      "https://ton-source-prod-testnet-1.herokuapp.com",
    ] as const,
  ),
  funcVersions: Object.freeze(
    [
      "0.4.6-wasmfix.0",
      "0.4.6",
      "0.4.5",
      "0.4.4-newops.1",
      "0.4.4-newops",
      "0.4.4",
      "0.4.3",
      "0.4.2",
      "0.4.1",
      "0.4.0",
      "0.3.0",
      "0.2.0",
    ] as const,
  ),
  tactVersions: Object.freeze(
    [
      "1.6.13",
      "1.6.12",
      "1.6.11",
      "1.6.10",
      "1.6.7",
      "1.6.6",
      "1.6.5",
      "1.6.4",
      "1.6.3",
      "1.6.2",
      "1.5.4",
      "1.5.3",
      "1.5.2",
      "1.5.1",
      "1.5.0",
      "1.4.4",
      "1.4.3",
      "1.4.2",
      "1.4.1",
      "1.4.0",
      "1.3.1",
      "1.3.0",
      "1.2.0",
      "1.1.5",
      "1.1.4",
      "1.1.3",
      "1.1.2",
      "1.1.1",
      "1.1.0",
      "1.0.0",
    ] as const,
  ),
  tolkVersions: Object.freeze(
    [
      "1.1.0",
      "1.0.0",
      "0.12.0",
    ] as const,
  ),
}) satisfies TonSourceConfiguration;

export function getTonSourceConfiguration(): TonSourceConfiguration {
  return TON_SOURCE_CONFIGURATION;
}
