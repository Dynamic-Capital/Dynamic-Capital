import {
  serve,
  type ServeInit,
} from "https://deno.land/std@0.224.0/http/server.ts";

export type EdgeHandler = (req: Request) => Response | Promise<Response>;

type ServeOptions = (Deno.ServeInit | ServeInit) & Record<string, unknown>;

export function registerHandler(
  handler: EdgeHandler,
  options?: ServeOptions,
): EdgeHandler {
  const globalAny = globalThis as {
    __SUPABASE_SKIP_AUTO_SERVE__?: boolean;
    __SUPABASE_EDGE_SERVER_STARTED__?: boolean;
  };

  if (!globalAny.__SUPABASE_SKIP_AUTO_SERVE__) {
    const isDenoTest = (() => {
      try {
        return Deno?.env?.get?.("DENO_TESTING") === "1";
      } catch {
        return false;
      }
    })();

    if (isDenoTest) {
      globalAny.__SUPABASE_SKIP_AUTO_SERVE__ = true;
    }
  }

  if (globalAny.__SUPABASE_SKIP_AUTO_SERVE__) {
    return handler;
  }

  if (globalAny.__SUPABASE_EDGE_SERVER_STARTED__) {
    return handler;
  }

  if (typeof Deno?.serve === "function") {
    globalAny.__SUPABASE_EDGE_SERVER_STARTED__ = true;
    try {
      if (options) {
        (Deno.serve as unknown as (
          opts: Deno.ServeInit,
          handler: EdgeHandler,
        ) => unknown)(
          options as Deno.ServeInit,
          handler,
        );
      } else {
        (Deno.serve as unknown as (handler: EdgeHandler) => unknown)(handler);
      }
    } catch (error) {
      if (error instanceof Deno.errors.AddrInUse) {
        // Another instance is already serving; reuse it for subsequent imports.
        return handler;
      }
      globalAny.__SUPABASE_EDGE_SERVER_STARTED__ = false;
      throw error;
    }
  } else {
    globalAny.__SUPABASE_EDGE_SERVER_STARTED__ = true;
    serve(handler, options as ServeInit | undefined);
  }
  return handler;
}
