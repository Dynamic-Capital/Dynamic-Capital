import manifest from "../../public/tonconnect-manifest.json";

const manifestJson = JSON.stringify(manifest);

export const TON_MANIFEST_FALLBACK_DATA_URL = `data:application/json,${encodeURIComponent(
  manifestJson,
)}`;

export function getTonManifestFallbackJson(): string {
  return manifestJson;
}
