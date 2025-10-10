import { assert, assertEquals, assertStringIncludes } from "std/assert/mod.ts";

import { createHttpClientWithEnvCa } from "./tls.ts";

type MutableDeno = typeof Deno & {
  createHttpClient: typeof Deno.createHttpClient;
};

function setCreateHttpClientMock(
  implementation: typeof Deno.createHttpClient,
): () => void {
  const original = Deno.createHttpClient;
  (Deno as MutableDeno).createHttpClient = implementation;
  return () => {
    (Deno as MutableDeno).createHttpClient = original;
  };
}

function restoreEnv(key: string, value: string | undefined): void {
  if (value === undefined) {
    try {
      Deno.env.delete(key);
    } catch {
      // Ignore; some environments do not allow deletion.
    }
  } else {
    Deno.env.set(key, value);
  }
}

Deno.test("createHttpClientWithEnvCa ensures TLS store when unset", async () => {
  let closed = false;
  let receivedOptions: Deno.CreateHttpClientOptions | undefined;
  const dummyClient: Deno.HttpClient = {
    rid: 1,
    close: () => {
      closed = true;
    },
  };

  const restoreClient = setCreateHttpClientMock((options) => {
    receivedOptions = options;
    return dummyClient;
  });

  const previousStore = Deno.env.get("DENO_TLS_CA_STORE");
  try {
    try {
      Deno.env.delete("DENO_TLS_CA_STORE");
    } catch {
      // Ignore environments that disallow deletion.
    }

    const context = await createHttpClientWithEnvCa();
    assert(context);
    assertEquals(receivedOptions?.caData, undefined);
    assertStringIncludes(
      context.description,
      "DENO_TLS_CA_STORE=system,mozilla",
    );
    assertEquals(Deno.env.get("DENO_TLS_CA_STORE"), "system,mozilla");

    context.client.close();
    assert(closed, "expected client.close() to be forwarded");
  } finally {
    restoreClient();
    restoreEnv("DENO_TLS_CA_STORE", previousStore ?? undefined);
  }
});

Deno.test("createHttpClientWithEnvCa threads inline certificate data", async () => {
  const sampleCert =
    "-----BEGIN CERTIFICATE-----\nMIIB\n-----END CERTIFICATE-----";
  let receivedOptions: Deno.CreateHttpClientOptions | undefined;

  const dummyClient: Deno.HttpClient = {
    rid: 2,
    close: () => {},
  };

  const restoreClient = setCreateHttpClientMock((options) => {
    receivedOptions = options;
    return dummyClient;
  });

  const previousStore = Deno.env.get("DENO_TLS_CA_STORE");
  const previousExtra = Deno.env.get("EXTRA_CA_CERT_DATA");

  try {
    try {
      Deno.env.delete("DENO_TLS_CA_STORE");
    } catch {
      // Ignore environments that disallow deletion.
    }
    Deno.env.set("EXTRA_CA_CERT_DATA", sampleCert);

    const context = await createHttpClientWithEnvCa();
    assert(context);
    assertStringIncludes(
      context.description,
      "inline certificate from EXTRA_CA_CERT_DATA",
    );
    assertEquals(receivedOptions?.caData, `${sampleCert}\n`);
  } finally {
    restoreClient();
    restoreEnv("DENO_TLS_CA_STORE", previousStore ?? undefined);
    restoreEnv("EXTRA_CA_CERT_DATA", previousExtra ?? undefined);
  }
});
