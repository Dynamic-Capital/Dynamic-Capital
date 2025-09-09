const envProxy: Record<string, string> = new Proxy({}, {
  get: (_, prop) => Deno.env.get(String(prop)) ?? "",
  set: (_, prop, value) => { Deno.env.set(String(prop), String(value)); return true; },
  deleteProperty: (_, prop) => { try { Deno.env.delete(String(prop)); } catch (_) { /* ignore */ } return true; }
});

(globalThis as any).process = { env: envProxy } as any;
