import { assertEquals } from "https://deno.land/std@0.224.0/assert/assert_equals.ts";
import { assertExists } from "https://deno.land/std@0.224.0/assert/assert_exists.ts";
import { toFileUrl } from "https://deno.land/std@0.224.0/path/to_file_url.ts";

import { freshImport } from "./utils/freshImport.ts";

const ORIGINAL_MODULE = new URL(
  "../apps/web/integrations/onedrive/index.ts",
  import.meta.url,
);

const STUB_MODULE = new URL("./onedrive-supabase-stub.ts", import.meta.url);

const baseItem = {
  id: "item-123",
  name: "Quarterly Report.pdf",
  size: 987654,
  webUrl: "https://example.com/items/item-123",
  lastModifiedDateTime: "2024-01-04T12:30:00Z",
  createdDateTime: "2024-01-01T08:15:00Z",
  isFolder: false,
  childCount: null,
  mimeType: "application/pdf",
  parentId: "parent-42",
  parentPath: "/drive/root:/reports",
  eTag: "etag-123",
  cTag: "ctag-456",
  downloadUrl: "https://example.com/items/item-123?download=1",
  hashes: {
    quickXorHash: "quickxor-hash",
    sha1Hash: "sha1-hash",
    sha256Hash: "sha256-hash",
  },
};

Deno.test("OneDrive integration smoke test wires through the proxy helper", async () => {
  const stub = await freshImport(
    STUB_MODULE,
  ) as typeof import("./onedrive-supabase-stub.ts");
  const {
    __resetOneDriveStub,
    __setFunctionHandler,
    __getInvocations,
    createClient,
  } = stub;

  __resetOneDriveStub();

  __setFunctionHandler("onedrive-proxy", (payload) => {
    const action = payload.action;
    switch (action) {
      case "list":
        return {
          items: [baseItem],
          nextLink: "https://example.com/items?cursor=next",
          deltaLink: "delta-token",
        };
      case "get":
        return {
          item: { ...baseItem, id: String(payload.itemId ?? baseItem.id) },
        };
      case "download":
        return {
          item: { ...baseItem, id: String(payload.itemId ?? baseItem.id) },
          downloadUrl: `${baseItem.downloadUrl}`,
        };
      case "upload":
        return {
          item: {
            ...baseItem,
            id: "uploaded-1",
            name: String(payload.path ?? baseItem.name),
            downloadUrl: "https://example.com/items/uploaded-1?download=1",
          },
        };
      default:
        throw new Error(`Unexpected action: ${String(action)}`);
    }
  });

  const source = await Deno.readTextFile(ORIGINAL_MODULE);
  const patchedSource = source
    .replace('import { Buffer } from "node:buffer";\n', "")
    .replace(
      'function toBase64(input: Uint8Array | ArrayBuffer): string {\n  const buffer = input instanceof Uint8Array\n    ? Buffer.from(input)\n    : Buffer.from(new Uint8Array(input));\n  return buffer.toString("base64");\n}\n',
      'function toBase64(input: Uint8Array | ArrayBuffer): string {\n  const bytes = input instanceof Uint8Array\n    ? input\n    : new Uint8Array(input);\n  let binary = "";\n  for (const byte of bytes) {\n    binary += String.fromCharCode(byte);\n  }\n  return btoa(binary);\n}\n',
    )
    .replace(
      "@/integrations/supabase/client",
      STUB_MODULE.href,
    );

  const patchedPath = await Deno.makeTempFile({ suffix: ".ts" });

  try {
    await Deno.writeTextFile(patchedPath, patchedSource);
    const patchedModuleUrl = toFileUrl(patchedPath);

    const {
      listDriveItems,
      getDriveItem,
      getDriveItemDownloadUrl,
      uploadDriveItem,
    } = await freshImport(patchedModuleUrl);

    const client = createClient("service");

    const listResponse = await listDriveItems(
      { driveId: "drive-001", path: "/reports", top: 25, orderBy: "name asc" },
      client,
    );
    assertEquals(listResponse.items.length, 1);
    assertEquals(listResponse.items[0].id, baseItem.id);
    assertEquals(
      listResponse.nextLink,
      "https://example.com/items?cursor=next",
    );
    assertEquals(listResponse.deltaLink, "delta-token");

    const detailed = await getDriveItem(
      {
        driveId: "drive-001",
        itemId: "item-123",
        select: ["id", "name", "size"],
        expand: "children",
      },
      client,
    );
    assertEquals(detailed.id, "item-123");
    assertEquals(detailed.name, baseItem.name);

    const download = await getDriveItemDownloadUrl(
      { driveId: "drive-001", itemId: "item-123" },
      client,
    );
    assertEquals(download.downloadUrl, baseItem.downloadUrl);
    assertEquals(download.item.id, "item-123");

    const payload = new TextEncoder().encode("hello onedrive");
    const uploaded = await uploadDriveItem(
      {
        driveId: "drive-001",
        path: "/reports/hello.txt",
        content: payload,
        contentType: "text/plain",
        conflictBehavior: "replace",
      },
      client,
    );
    assertEquals(uploaded.id, "uploaded-1");
    assertEquals(uploaded.name, "/reports/hello.txt");

    const invocations = __getInvocations();
    assertEquals(invocations.length, 4);

    assertEquals(invocations[0], {
      name: "onedrive-proxy",
      payload: {
        action: "list",
        driveId: "drive-001",
        path: "/reports",
        top: 25,
        orderBy: "name asc",
      },
    });

    assertEquals(invocations[1], {
      name: "onedrive-proxy",
      payload: {
        action: "get",
        driveId: "drive-001",
        itemId: "item-123",
        select: "id,name,size",
        expand: "children",
      },
    });

    assertEquals(invocations[2], {
      name: "onedrive-proxy",
      payload: {
        action: "download",
        driveId: "drive-001",
        itemId: "item-123",
      },
    });

    assertExists(invocations[3].payload.content);
    assertEquals(invocations[3], {
      name: "onedrive-proxy",
      payload: {
        action: "upload",
        driveId: "drive-001",
        path: "/reports/hello.txt",
        content: "aGVsbG8gb25lZHJpdmU=",
        encoding: "base64",
        contentType: "text/plain",
        conflictBehavior: "replace",
      },
    });
  } finally {
    await Deno.remove(patchedPath).catch(() => {});
    __resetOneDriveStub();
  }
});
