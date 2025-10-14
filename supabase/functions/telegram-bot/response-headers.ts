const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-telegram-bot-api-secret-token",
} as const;

export const DEFAULT_ALLOWED_METHODS = "GET,HEAD,POST,OPTIONS" as const;

export type BaseHeaders = Record<string, string>;

export function createBaseHeaders(
  allowedMethods: string = DEFAULT_ALLOWED_METHODS,
): BaseHeaders {
  return {
    ...CORS_HEADERS,
    "Allow": allowedMethods,
    "Access-Control-Allow-Methods": allowedMethods,
  };
}

export function withBaseHeaders(
  res: Response,
  allowedMethods: string = DEFAULT_ALLOWED_METHODS,
): Response {
  const headers = createBaseHeaders(allowedMethods);
  for (const [key, value] of Object.entries(headers)) {
    res.headers.set(key, value);
  }
  return res;
}

export function buildBaseHeaderApplier(
  allowedMethods: string = DEFAULT_ALLOWED_METHODS,
): (res: Response) => Response {
  const headers = createBaseHeaders(allowedMethods);
  return (res: Response): Response => {
    for (const [key, value] of Object.entries(headers)) {
      res.headers.set(key, value);
    }
    return res;
  };
}

export { CORS_HEADERS };
