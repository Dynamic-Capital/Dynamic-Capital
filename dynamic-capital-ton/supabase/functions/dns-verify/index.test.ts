// Run with `$(bash scripts/deno_bin.sh) test --no-npm -A dynamic-capital-ton/supabase/functions/dns-verify/index.test.ts`

import {
  assertEquals,
  assertRejects,
} from "https://deno.land/std@0.224.0/testing/asserts.ts";

import { DNS_RECORD_SOURCES, fetchDnsRecords } from "./index.ts";

type FetchInvocation = {
  input: Request | URL | string;
  init?: RequestInit;
};

type ResponseFactory = () => Promise<Response>;

function createFetchStub(factories: ResponseFactory[]): {
  stub: typeof fetch;
  invocations: FetchInvocation[];
} {
  let callCount = 0;
  const invocations: FetchInvocation[] = [];

  const stub: typeof fetch = async (input, init) => {
    invocations.push({ input, init });
    const factory = factories[callCount];
    callCount += 1;
    if (!factory) {
      throw new Error("Unexpected fetch invocation");
    }
    return await factory();
  };

  return { stub, invocations };
}

Deno.test("fetchDnsRecords returns the first successful gateway", async () => {
  const { stub, invocations } = createFetchStub([
    () => Promise.resolve(new Response("signature=abc\n")),
  ]);

  const result = await fetchDnsRecords(stub);

  assertEquals(result.text, "signature=abc\n");
  assertEquals(invocations.length, 1);
});

Deno.test("fetchDnsRecords falls back when the primary gateway fails", async () => {
  const { stub, invocations } = createFetchStub([
    () => Promise.reject(new TypeError("Network unreachable")),
    () => Promise.resolve(new Response("signature=def\n", { status: 200 })),
  ]);

  const result = await fetchDnsRecords(stub);

  assertEquals(result.text, "signature=def\n");
  assertEquals(invocations.length, 2);
});

Deno.test("fetchDnsRecords surfaces an error after exhausting all gateways", async () => {
  const { stub, invocations } = createFetchStub([
    () => Promise.resolve(new Response(null, { status: 502 })),
    () => Promise.reject(new TypeError("DNS failure")),
    () => Promise.reject(new TypeError("Gateway timeout")),
    () => Promise.reject(new TypeError("Resolver offline")),
  ]);

  await assertRejects(
    () => fetchDnsRecords(stub),
    Error,
    "Unable to fetch DNS records",
  );
  assertEquals(invocations.length, DNS_RECORD_SOURCES.length);
});
