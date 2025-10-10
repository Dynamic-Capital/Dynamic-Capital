import { createClient } from "../_shared/client.ts";
import { optionalEnv } from "../_shared/env.ts";
import { bad, ok } from "../_shared/http.ts";
import { RealtimeClient } from "https://raw.githubusercontent.com/openai/openai-realtime-api-beta/refs/heads/main/lib/client.js";
import { registerHandler } from "../_shared/serve.ts";

type Timer = ReturnType<typeof setInterval>;

const OPENAI_API_KEY = optionalEnv("OPENAI_API_KEY");
const OPENAI_REALTIME_MODEL = optionalEnv("OPENAI_REALTIME_MODEL");
const HEARTBEAT_INTERVAL_MS = 25_000;

const decoder = new TextDecoder();

function errorResponse(message: string, status = 400) {
  return new Response(message, {
    status,
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}

type BrowserEvent = {
  type?: string;
  [key: string]: unknown;
};

function isString(value: unknown): value is string {
  return typeof value === "string";
}

async function toMessageString(data: unknown): Promise<string | null> {
  if (isString(data)) return data;
  if (data instanceof Uint8Array) return decoder.decode(data);
  if (data instanceof ArrayBuffer) return decoder.decode(new Uint8Array(data));
  if (data instanceof Blob && typeof data.text === "function") {
    return await data.text();
  }
  return null;
}

async function authenticate(jwt: string) {
  const supabase = createClient("service");
  const { data, error } = await supabase.auth.getUser(jwt);
  if (error || !data.user) {
    console.warn("[websocket-relay] invalid JWT", error?.message);
    return null;
  }
  return data.user;
}

function startHeartbeat(socket: WebSocket): Timer {
  return setInterval(() => {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(
        JSON.stringify({
          type: "heartbeat",
          ts: new Date().toISOString(),
        }),
      );
    }
  }, HEARTBEAT_INTERVAL_MS);
}

function relayToOpenAI(client: RealtimeClient, raw: string) {
  let payload: BrowserEvent;
  try {
    payload = JSON.parse(raw);
  } catch (error) {
    console.error("[websocket-relay] failed to parse message", error);
    return { ok: false, reason: "invalid_json" as const };
  }

  if (!payload.type || typeof payload.type !== "string") {
    console.warn("[websocket-relay] ignoring event without type", payload);
    return { ok: false, reason: "missing_type" as const };
  }

  try {
    client.realtime.send(payload.type, payload);
    return { ok: true as const };
  } catch (error) {
    console.error("[websocket-relay] failed to forward event", error);
    return { ok: false, reason: "forward_failed" as const };
  }
}

async function handleWebSocket(req: Request) {
  const upgrade = req.headers.get("upgrade") || "";
  if (upgrade.toLowerCase() !== "websocket") {
    return bad("Expected WebSocket upgrade", undefined, req);
  }

  const url = new URL(req.url);
  const jwt = url.searchParams.get("jwt");
  if (!jwt) {
    return errorResponse("Auth token not provided", 403);
  }

  const user = await authenticate(jwt);
  if (!user) {
    return errorResponse("Invalid token provided", 403);
  }

  let client: RealtimeClient | null = null;
  let connectedToOpenAI = false;
  const queuedMessages: string[] = [];

  const { socket, response } = Deno.upgradeWebSocket(req, { idleTimeout: 120 });

  socket.addEventListener("open", async () => {
    console.log("[websocket-relay] socket opened", user.id);
    socket.send(
      JSON.stringify({
        type: "connected",
        ts: new Date().toISOString(),
        upstream: OPENAI_API_KEY ? "openai" : null,
      }),
    );

    let heartbeat: Timer | null = null;

    const stop = () => {
      if (heartbeat) {
        clearInterval(heartbeat);
        heartbeat = null;
      }
      if (client) {
        client.disconnect();
      }
    };

    socket.addEventListener("close", (event) => {
      console.log("[websocket-relay] socket closed", event.code, event.reason);
      stop();
    });

    socket.addEventListener("error", (event) => {
      console.error("[websocket-relay] socket errored", event);
      stop();
    });

    if (!OPENAI_API_KEY) {
      heartbeat = startHeartbeat(socket);
      return;
    }

    client = new RealtimeClient({ apiKey: OPENAI_API_KEY, debug: false });
    client.realtime.on("server.*", (event) => {
      try {
        socket.send(JSON.stringify(event));
      } catch (error) {
        console.error("[websocket-relay] failed to emit server event", error);
      }
    });

    client.realtime.on("close", ({ error }) => {
      console.warn("[websocket-relay] upstream closed", { error });
      if (socket.readyState === WebSocket.OPEN) {
        socket.close(1011, "upstream closed");
      }
    });

    try {
      await client.connect({ model: OPENAI_REALTIME_MODEL || undefined });
      await client.waitForSessionCreated();
      connectedToOpenAI = true;
      heartbeat = startHeartbeat(socket);
      while (queuedMessages.length > 0) {
        const raw = queuedMessages.shift();
        if (raw) {
          const result = relayToOpenAI(client, raw);
          if (!result.ok) {
            socket.send(
              JSON.stringify({
                type: "relay.error",
                reason: result.reason,
              }),
            );
          }
        }
      }
      socket.send(
        JSON.stringify({
          type: "upstream.ready",
          ts: new Date().toISOString(),
        }),
      );
    } catch (error) {
      console.error("[websocket-relay] failed to connect to OpenAI", error);
      socket.send(
        JSON.stringify({
          type: "relay.error",
          reason: "upstream_connection_failed",
        }),
      );
      socket.close(1011, "failed to connect upstream");
      stop();
    }
  });

  socket.addEventListener("message", async (event) => {
    const raw = await toMessageString(event.data);
    if (!raw) {
      console.warn("[websocket-relay] ignoring non-text message");
      return;
    }

    if (!OPENAI_API_KEY || !client) {
      socket.send(
        JSON.stringify({
          type: "echo",
          received: raw,
          ts: new Date().toISOString(),
        }),
      );
      return;
    }

    if (!connectedToOpenAI) {
      queuedMessages.push(raw);
      return;
    }

    const result = relayToOpenAI(client, raw);
    if (!result.ok) {
      socket.send(
        JSON.stringify({
          type: "relay.error",
          reason: result.reason,
        }),
      );
    }
  });

  return response;
}

async function handler(req: Request) {
  const { pathname } = new URL(req.url);

  if (req.method === "GET" && pathname.endsWith("/version")) {
    return ok({ name: "websocket-relay", ts: new Date().toISOString() }, req);
  }

  if (req.method === "GET" && pathname.endsWith("/health")) {
    return ok({ status: "ok" }, req);
  }

  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: { "access-control-allow-origin": "*" },
    });
  }

  if (req.method !== "GET") {
    return bad("Method Not Allowed", undefined, req);
  }

  return await handleWebSocket(req);
}

export default handler;

registerHandler(handler);
