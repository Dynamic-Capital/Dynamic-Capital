export let capturedHandler: (req: Request) => Promise<Response> | Response;

export function serve(
  handler: (req: Request) => Promise<Response> | Response,
): Promise<void> {
  capturedHandler = handler;
  return Promise.resolve();
}

export function registerHandler(
  handler: (req: Request) => Promise<Response> | Response,
) {
  capturedHandler = handler;
  return handler;
}
