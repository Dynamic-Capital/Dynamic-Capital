import { assert, assertEquals, assertStringIncludes } from "std/assert/mod.ts";

import { createHttpClientWithEnvCa, resetHttpClientCache } from "./tls.ts";

type MutableDeno = typeof Deno & {
  createHttpClient: typeof Deno.createHttpClient;
  stat: typeof Deno.stat;
  readTextFile: typeof Deno.readTextFile;
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

function setStatMock(implementation: typeof Deno.stat): () => void {
  const original = Deno.stat;
  (Deno as MutableDeno).stat = implementation;
  return () => {
    (Deno as MutableDeno).stat = original;
  };
}

function setReadTextFileMock(
  implementation: typeof Deno.readTextFile,
): () => void {
  const original = Deno.readTextFile;
  (Deno as MutableDeno).readTextFile = implementation;
  return () => {
    (Deno as MutableDeno).readTextFile = original;
  };
}

type HttpClientOptions = Deno.CreateHttpClientOptions & {
  caData?: string;
  proxy?: { url: string };
};

function makeFileInfo(): Deno.FileInfo {
  const now = new Date();
  return {
    isFile: true,
    isDirectory: false,
    isSymlink: false,
    size: 42,
    mtime: now,
    atime: now,
    birthtime: now,
    ctime: now,
    dev: 0,
    ino: 0,
    mode: null,
    nlink: 0,
    uid: 0,
    gid: 0,
    rdev: 0,
    blksize: null,
    blocks: null,
    isBlockDevice: false,
    isCharDevice: false,
    isFifo: false,
    isSocket: false,
  };
}

Deno.test("createHttpClientWithEnvCa ensures TLS store when unset", async () => {
  resetHttpClientCache();
  let closed = false;
  let receivedOptions: HttpClientOptions | undefined;

  const dummyClient = {
    close: () => {
      closed = true;
    },
  } as Deno.HttpClient;

  const restoreClient = setCreateHttpClientMock((options) => {
    receivedOptions = options as HttpClientOptions;
    return dummyClient;
  });
  const restoreStat = setStatMock(async () => {
    throw new Error("not found");
  });
  const restoreRead = setReadTextFileMock(async () => {
    throw new Error("unexpected read");
  });
  const previousSslCert = Deno.env.get("SSL_CERT_FILE");
  Deno.env.set("SSL_CERT_FILE", "");

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
    restoreStat();
    restoreRead();
    restoreEnv("DENO_TLS_CA_STORE", previousStore ?? undefined);
    restoreEnv("SSL_CERT_FILE", previousSslCert ?? undefined);
    resetHttpClientCache();
  }
});

Deno.test("createHttpClientWithEnvCa threads inline certificate data", async () => {
  resetHttpClientCache();
  const sampleCert =
    "-----BEGIN CERTIFICATE-----\nMIIB\n-----END CERTIFICATE-----";
  let receivedOptions: HttpClientOptions | undefined;

  const dummyClient = { close: () => {} } as Deno.HttpClient;

  const restoreClient = setCreateHttpClientMock((options) => {
    receivedOptions = options as HttpClientOptions;
    return dummyClient;
  });
  const restoreStat = setStatMock(async () => {
    throw new Error("not found");
  });
  const restoreRead = setReadTextFileMock(async () => {
    throw new Error("unexpected read");
  });
  const previousSslCert = Deno.env.get("SSL_CERT_FILE");
  Deno.env.set("SSL_CERT_FILE", "");

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
    restoreStat();
    restoreRead();
    restoreEnv("DENO_TLS_CA_STORE", previousStore ?? undefined);
    restoreEnv("EXTRA_CA_CERT_DATA", previousExtra ?? undefined);
    restoreEnv("SSL_CERT_FILE", previousSslCert ?? undefined);
    resetHttpClientCache();
  }
});

Deno.test("createHttpClientWithEnvCa caches filesystem bundle reads", async () => {
  resetHttpClientCache();
  const previousStore = Deno.env.get("EXTRA_CA_CERT");
  Deno.env.set("EXTRA_CA_CERT", "/tmp/test-cert.pem");
  const previousSslCert = Deno.env.get("SSL_CERT_FILE");
  Deno.env.set("SSL_CERT_FILE", "");

  let statCalls = 0;
  let readCalls = 0;
  let createCalls = 0;

  const restoreClient = setCreateHttpClientMock(() => {
    createCalls += 1;
    return { close: () => {} } as Deno.HttpClient;
  });

  const restoreStat = setStatMock(async (path: string | URL) => {
    const normalised = typeof path === "string" ? path : path.toString();
    if (normalised === "/tmp/test-cert.pem") {
      statCalls += 1;
      return makeFileInfo();
    }
    throw new Error("not found");
  });

  const restoreRead = setReadTextFileMock(async (path: string | URL) => {
    const normalised = typeof path === "string" ? path : path.toString();
    if (normalised === "/tmp/test-cert.pem") {
      readCalls += 1;
      return "CERTDATA";
    }
    throw new Error("not found");
  });

  try {
    const first = await createHttpClientWithEnvCa();
    assert(first);
    first.client.close();

    const second = await createHttpClientWithEnvCa();
    assert(second);
    second.client.close();

    assertEquals(statCalls, 1);
    assertEquals(readCalls, 1);
    assertEquals(createCalls, 2);
  } finally {
    restoreClient();
    restoreStat();
    restoreRead();
    restoreEnv("EXTRA_CA_CERT", previousStore ?? undefined);
    restoreEnv("SSL_CERT_FILE", previousSslCert ?? undefined);
    resetHttpClientCache();
  }
});

Deno.test("createHttpClientWithEnvCa refreshes cache when inputs change", async () => {
  resetHttpClientCache();
  const previousInline = Deno.env.get("EXTRA_CA_CERT_DATA");

  let lastOptions: HttpClientOptions | undefined;
  const restoreClient = setCreateHttpClientMock((options) => {
    lastOptions = options as HttpClientOptions;
    return { close: () => {} } as Deno.HttpClient;
  });
  const restoreStat = setStatMock(async () => {
    throw new Error("not found");
  });
  const restoreRead = setReadTextFileMock(async () => {
    throw new Error("unexpected read");
  });
  const previousSslCert = Deno.env.get("SSL_CERT_FILE");
  Deno.env.set("SSL_CERT_FILE", "");

  try {
    Deno.env.set("EXTRA_CA_CERT_DATA", "first-cert");
    const first = await createHttpClientWithEnvCa();
    assert(first);
    first.client.close();
    assertEquals(lastOptions?.caData, "first-cert\n");

    Deno.env.set("EXTRA_CA_CERT_DATA", "second-cert");
    const second = await createHttpClientWithEnvCa();
    assert(second);
    second.client.close();
    assertEquals(lastOptions?.caData, "second-cert\n");
  } finally {
    restoreClient();
    restoreStat();
    restoreRead();
    restoreEnv("EXTRA_CA_CERT_DATA", previousInline ?? undefined);
    restoreEnv("SSL_CERT_FILE", previousSslCert ?? undefined);
    resetHttpClientCache();
  }
});
