export let capturedHandler: (req: Request) => Promise<Response> | Response;
export function serve(handler: (req: Request) => Promise<Response> | Response) {
  capturedHandler = handler;
  return {} as any;
}
