import metadata from "../../../../dynamic-capital-ton/contracts/jetton/metadata.json" assert {
  type: "json",
};

type JettonAttribute = {
  readonly trait_type: string;
  readonly value: string | number | boolean;
  readonly display_type?: string;
};

type JettonMetadata = {
  readonly name: string;
  readonly symbol: string;
  readonly description: string;
  readonly decimals: number;
  readonly address: string;
  readonly image?: string;
  readonly external_url?: string;
  readonly sameAs?: readonly string[];
  readonly attributes?: readonly JettonAttribute[];
  readonly [key: string]: unknown;
};

const METADATA: JettonMetadata = metadata as JettonMetadata;
const METADATA_BODY = `${JSON.stringify(METADATA, null, 2)}\n`;

function createHeaders(): Headers {
  const headers = new Headers();
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set(
    "cache-control",
    "public, max-age=300, stale-while-revalidate=3600",
  );
  headers.set("access-control-allow-origin", "*");
  headers.set("x-dynamic-origin", "digitalocean-metadata-proxy");
  return headers;
}

export const runtime = "edge";
export const preferredRegion = ["arn1", "fra1", "iad1", "sin1"];

export async function GET(): Promise<Response> {
  return new Response(METADATA_BODY, {
    status: 200,
    headers: createHeaders(),
  });
}

export async function HEAD(): Promise<Response> {
  return new Response(null, {
    status: 200,
    headers: createHeaders(),
  });
}
