export function extractForwardAuthHeaders(
  request: Request,
): HeadersInit | undefined {
  const headers: Record<string, string> = {};

  const authorization = request.headers.get("Authorization");
  if (authorization) {
    headers.Authorization = authorization;
  }

  const clientInfo = request.headers.get("X-Client-Info");
  if (clientInfo) {
    headers["X-Client-Info"] = clientInfo;
  }

  return Object.keys(headers).length > 0 ? headers : undefined;
}
