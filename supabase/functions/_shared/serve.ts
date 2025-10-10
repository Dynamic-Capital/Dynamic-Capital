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

  const attemptServe = () => {
    if (typeof Deno?.serve === "function") {
      if (options) {
        return (Deno.serve as unknown as (
          opts: Deno.ServeInit,
          handler: EdgeHandler,
        ) => unknown)(
          options as Deno.ServeInit,
          handler,
        );
      }

      return (Deno.serve as unknown as (handler: EdgeHandler) => unknown)(
        handler,
      );
    }

    return serve(handler, options as ServeInit | undefined);
  };

  try {
    attemptServe();
  } catch (error) {
    const addrInUse = typeof Deno !== "undefined" &&
      error instanceof Deno.errors.AddrInUse;
    const portAlreadySpecified = typeof options === "object" &&
      options !== null && "port" in options;

    if (!addrInUse || portAlreadySpecified) {
      throw error;
    }

    const fallbackOptions = {
      ...(typeof options === "object" && options !== null ? options : {}),
      port: 0,
    } satisfies ServeOptions;

    if (typeof Deno?.serve === "function") {
      (Deno.serve as unknown as (
        opts: Deno.ServeInit,
        handler: EdgeHandler,
      ) => unknown)(
        fallbackOptions as Deno.ServeInit,
        handler,
      );
    } else {
      serve(handler, fallbackOptions as ServeInit);
    }
  }
  return handler;
}
