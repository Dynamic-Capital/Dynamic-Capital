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
  };
  if (globalAny.__SUPABASE_SKIP_AUTO_SERVE__) {
    return handler;
  }

  if (typeof Deno?.serve === "function") {
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
  } else {
    serve(handler, options as ServeInit | undefined);
  }
  return handler;
}
