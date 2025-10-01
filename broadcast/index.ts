import { enqueue } from "../queue/index.ts";
import { configClient } from "../apps/web/utils/config.ts";

export interface PlanBroadcastOptions {
  segment: number[] | { userIds: number[] };
  text: string;
  media?: string;
  chunkSize?: number;
  pauseMs?: number;
}

export async function resolveTargets(
  segment: PlanBroadcastOptions["segment"],
): Promise<number[]> {
  if (Array.isArray(segment)) return segment;
  if (segment && Array.isArray((segment as { userIds?: number[] }).userIds)) {
    return (segment as { userIds: number[] }).userIds;
  }
  throw new Error("Invalid broadcast segment");
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function planBroadcast(opts: PlanBroadcastOptions) {
  let enabled: boolean;
  try {
    enabled = await configClient.getFlag("broadcasts_enabled");
  } catch (err) {
    if (err instanceof Error && err.message.includes("timed out")) {
      throw new Error(
        "Config request timed out while checking broadcasts_enabled",
      );
    }
    throw err;
  }
  if (!enabled) {
    throw new Error("Broadcasts disabled");
  }
  const { segment, text, media, chunkSize = 25, pauseMs = 500 } = opts;
  let targets: number[];
  try {
    targets = await resolveTargets(segment);
  } catch (err) {
    console.error(err);
    throw err;
  }
  for (let i = 0; i < targets.length; i += chunkSize) {
    const chunk = targets.slice(i, i + chunkSize);
    await enqueue("broadcast:sendBatch", { userIds: chunk, text, media }, {
      maxAttempts: 5,
      backoff: "exp",
    });
    if (pauseMs) await sleep(pauseMs);
  }
  return {
    total: targets.length,
    chunks: Math.ceil(targets.length / chunkSize),
  };
}
