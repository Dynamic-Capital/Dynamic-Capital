const invocations: Array<{ name: string; payload: Record<string, unknown> }> =
  [];

const handlers = new Map<
  string,
  (payload: Record<string, unknown>) => unknown | Promise<unknown>
>();

export function __resetOneDriveStub() {
  invocations.length = 0;
  handlers.clear();
}

export function __setFunctionHandler(
  name: string,
  handler: (payload: Record<string, unknown>) => unknown | Promise<unknown>,
) {
  handlers.set(name, handler);
}

export function __getInvocations() {
  return invocations.map((entry) => ({
    name: entry.name,
    payload: { ...entry.payload },
  }));
}

export function createClient(role: "anon" | "service" = "anon") {
  if (role !== "service") {
    throw new Error(
      `OneDrive stub only supports service role clients (received: ${role})`,
    );
  }

  return {
    functions: {
      invoke: async <T>(
        name: string,
        options: { body?: Record<string, unknown> } = {},
      ): Promise<{ data: T | null; error: { message: string } | null }> => {
        const payload = options.body ?? {};
        invocations.push({ name, payload });
        const handler = handlers.get(name);
        if (!handler) {
          return {
            data: null,
            error: { message: `No handler registered for ${name}` },
          };
        }
        try {
          const result = await handler(payload);
          return { data: result as T, error: null };
        } catch (error) {
          const message = error instanceof Error
            ? error.message
            : String(error);
          return { data: null, error: { message } };
        }
      },
    },
  } satisfies SupabaseClient;
}

type SupabaseFunctions = {
  invoke<T>(
    name: string,
    options?: { body?: Record<string, unknown> },
  ): Promise<{ data: T | null; error: { message: string } | null }>;
};

export type SupabaseClient = {
  functions: SupabaseFunctions;
};
