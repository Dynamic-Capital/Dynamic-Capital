export function createThrottler() {
  return (
    next: (
      method: string,
      payload: unknown,
      signal?: AbortSignal,
    ) => Promise<unknown>,
  ) => next;
}
