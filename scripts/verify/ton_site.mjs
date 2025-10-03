import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const [configPath = "dns/dynamiccapital.ton.json", domainOverride = ""] =
  process.argv.slice(2);

const lines = [];
const record = (key, value) => {
  lines.push(`${key}=${String(value)}`);
};

const sanitize = (value) => String(value ?? "").replace(/\s+/g, " ").trim();

record("config_path", configPath);

let config;
try {
  const raw = await readFile(configPath, "utf8");
  config = JSON.parse(raw);
  record("config_present", "PASS");
} catch (error) {
  record("config_present", "FAIL");
  record("error", sanitize(error.message));
  console.log(lines.join("\n"));
  process.exit(0);
}

const domain = sanitize(domainOverride) || sanitize(config.domain) ||
  sanitize(config.dns);
if (domain) {
  record("domain", domain);
} else {
  record("domain", "UNKNOWN");
}

const normalizedDomain = domain ? domain.toLowerCase().replace(/\.+$/, "") : "";

const aliasHostSet = new Set();
if (Array.isArray(config.records) && normalizedDomain) {
  for (const entry of config.records) {
    if (!entry || typeof entry !== "object") {
      continue;
    }
    const type = sanitize(entry.type).toUpperCase();
    if (type !== "CNAME") {
      continue;
    }
    const target = sanitize(entry.data).toLowerCase().replace(/\.+$/, "");
    if (!target || target !== normalizedDomain) {
      continue;
    }
    const rawName = sanitize(entry.name);
    if (!rawName || rawName === "@") {
      continue;
    }
    let host = rawName.toLowerCase().replace(/\.+$/, "");
    if (!host) {
      continue;
    }
    if (!host.endsWith(`.${normalizedDomain}`)) {
      if (!host.includes(".")) {
        host = `${host}.${normalizedDomain}`;
      } else {
        const candidate = host.replace(/\.+$/, "");
        if (candidate.endsWith(`.${normalizedDomain}`)) {
          host = candidate;
        } else {
          continue;
        }
      }
    }
    host = host.replace(/\.+$/, "");
    if (host && host !== normalizedDomain) {
      aliasHostSet.add(host);
    }
  }
}

const aliasHosts = Array.from(aliasHostSet);
if (aliasHosts.length > 0) {
  record("tonsite_alias_hosts", aliasHosts.join(","));
}

const tonSite = config.ton_site && typeof config.ton_site === "object"
  ? config.ton_site
  : null;
if (tonSite) {
  record("ton_site_present", "PASS");
} else {
  record("ton_site_present", "FAIL");
}

const adnl = tonSite?.adnl_address;
if (typeof adnl === "string") {
  const normalized = adnl.trim();
  const adnlRegex = /^0:[0-9a-fA-F]{64}$/;
  record("adnl_address", normalized);
  record("adnl_format", adnlRegex.test(normalized) ? "PASS" : "FAIL");
} else {
  record("adnl_address", "MISSING");
  record("adnl_format", "FAIL");
}

const publicKey = tonSite?.public_key_base64;
if (typeof publicKey === "string" && publicKey.trim()) {
  let decodedBytes = 0;
  let validBase64 = false;
  try {
    const normalized = publicKey.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - normalized.length % 4) % 4);
    const buf = Buffer.from(padded, "base64");
    decodedBytes = buf.length;
    validBase64 = decodedBytes === 32;
  } catch (error) {
    record("public_key_error", sanitize(error.message));
  }
  record("public_key_base64", publicKey.trim());
  record("public_key_bytes", decodedBytes);
  record("public_key_valid", validBase64 ? "PASS" : "FAIL");
} else {
  record("public_key_base64", "MISSING");
  record("public_key_bytes", 0);
  record("public_key_valid", "FAIL");
}

const generated = tonSite && typeof tonSite.generated === "object"
  ? tonSite.generated
  : null;
if (generated) {
  const command = sanitize(generated.command);
  if (command) {
    record("generated_command", command);
    record(
      "generated_command_status",
      command === "npm run ton:generate-adnl" ? "PASS" : "WARN",
    );
  } else {
    record("generated_command", "MISSING");
    record("generated_command_status", "FAIL");
  }

  const timestamp = sanitize(generated.timestamp);
  if (timestamp) {
    record("generated_timestamp", timestamp);
    const parsed = new Date(timestamp);
    record(
      "generated_timestamp_status",
      Number.isNaN(parsed.getTime()) ? "FAIL" : "PASS",
    );
  } else {
    record("generated_timestamp", "MISSING");
    record("generated_timestamp_status", "FAIL");
  }

  if (generated.note) {
    record("generated_note", sanitize(generated.note));
  }
} else {
  record("generated_command", "MISSING");
  record("generated_command_status", "FAIL");
  record("generated_timestamp", "MISSING");
  record("generated_timestamp_status", "FAIL");
}

const resolver = typeof config.resolver_contract === "string"
  ? config.resolver_contract.trim()
  : "";
record("resolver_contract", resolver || "MISSING");

let resolverDetails = null;
if (resolver) {
  try {
    const normalized = resolver.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - normalized.length % 4) % 4);
    const buf = Buffer.from(padded, "base64");
    if (buf.length !== 36) {
      throw new Error(`Unexpected friendly address length ${buf.length}`);
    }
    const tag = buf[0];
    const workchainByte = buf[1];
    const isBounceable = (tag & 0x11) === 0x11;
    const isTestOnly = (tag & 0x80) === 0x80;
    const workchain = workchainByte > 127 ? workchainByte - 256 : workchainByte;
    const hashPart = buf.subarray(2, 34).toString("hex");
    resolverDetails = { isBounceable, isTestOnly, workchain, hash: hashPart };
    record("resolver_address_workchain", workchain);
    record("resolver_address_hash", hashPart);
    record("resolver_address_bounceable", isBounceable ? "yes" : "no");
    record("resolver_address_testnet", isTestOnly ? "yes" : "no");
    record("resolver_format", "PASS");
  } catch (error) {
    record("resolver_format", "FAIL");
    record("resolver_error", sanitize(error.message));
  }
} else {
  record("resolver_format", "FAIL");
}

if (Array.isArray(config.notes) && adnl) {
  const mention = config.notes.some((note) =>
    typeof note === "string" && note.includes(adnl)
  );
  record("notes_reference_adnl", mention ? "PASS" : "FAIL");
}

const fetchWithCurlFallback = async (
  url,
  { label = "", timeoutMs = 8000 } = {},
) => {
  const errorPrefix = label ? `${label}_` : "";
  if (typeof fetch === "function") {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(timeoutMs),
      });
      const body = await response.text();
      return {
        status: response.status,
        body,
        ok: response.ok,
        transport: "fetch",
      };
    } catch (error) {
      if (errorPrefix) {
        record(`${errorPrefix}fetch_error`, sanitize(error.message));
      }
    }
  }

  try {
    const { stdout } = await execFileAsync("curl", [
      "-sS",
      "-m",
      String(Math.ceil(timeoutMs / 1000)),
      "-w",
      "\n%{http_code}",
      url,
    ]);
    const trimmed = stdout.trimEnd();
    const lines = trimmed.split("\n");
    const statusLine = lines.pop() ?? "";
    const status = Number.parseInt(statusLine, 10);
    const body = lines.join("\n");
    if (!Number.isNaN(status)) {
      return {
        status,
        body,
        ok: status >= 200 && status < 300,
        transport: "curl",
      };
    }
    return { status: 0, body, ok: false };
  } catch (error) {
    if (errorPrefix) {
      record(`${errorPrefix}curl_error`, sanitize(error.message));
    }
    return { status: 0, body: "", ok: false };
  }
};

let tonapiStatus = "SKIPPED";
if (domain) {
  const url = `https://tonapi.io/v2/dns/${encodeURIComponent(domain)}`;
  const result = await fetchWithCurlFallback(url, { label: "tonapi" });
  if (result.status) {
    record("tonapi_http_status", result.status);
  }
  if (result.transport) {
    record("tonapi_transport", result.transport);
  }
  if (result.ok) {
    tonapiStatus = "PASS";
    try {
      const payload = JSON.parse(result.body);
      const tonapiAddress = payload?.item?.address;
      if (tonapiAddress) {
        record("tonapi_resolver_address", tonapiAddress);
        const [wcStr, hashPart] = tonapiAddress.split(":");
        const wc = Number.parseInt(wcStr, 10);
        if (resolverDetails && !Number.isNaN(wc) && hashPart) {
          const match = wc === resolverDetails.workchain &&
            hashPart.toLowerCase() === resolverDetails.hash;
          record("resolver_matches_dns", match ? "PASS" : "FAIL");
        }
      }
    } catch (error) {
      tonapiStatus = "FAIL";
      record("tonapi_error", sanitize(error.message));
    }
  } else if (result.status) {
    tonapiStatus = "FAIL";
    const preview = sanitize(result.body).slice(0, 240);
    if (preview) {
      record("tonapi_error", preview);
    }
  } else if (!result.status) {
    tonapiStatus = "ERROR";
  }
}
record("tonapi_lookup", tonapiStatus);

const gatewayFailureIndicators = [
  "dns resolution failure",
  "not found",
  "upstream connect error",
  "connection timeout",
  "domain for sale",
  "forsale",
  "error",
];

const rawGatewayList = process.env.TON_SITE_GATEWAYS ?? "";
const gatewayBases = rawGatewayList
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

const defaultGatewayBases = [
  "https://ton-gateway.dynamic-capital.ondigitalocean.app",
  "https://tonsite.io",
  "https://resolve.tonapi.io",
  "https://toncdn.io",
  "https://tonsite.link",
  "https://ton.site",
];

const candidateGateways = gatewayBases.length > 0
  ? gatewayBases
  : defaultGatewayBases;

if (candidateGateways.length > 0) {
  record("tonsite_gateway_candidates", candidateGateways.join(","));
}

const hostsToProbe = normalizedDomain
  ? [
    normalizedDomain,
    ...aliasHosts.filter((alias) => alias !== normalizedDomain),
  ]
  : [];

if (hostsToProbe.length > 0) {
  record("tonsite_gateway_hosts", hostsToProbe.join(","));
}

const slugForHost = (host) => {
  if (!host) {
    return "unknown";
  }
  if (normalizedDomain && host === normalizedDomain) {
    return "root";
  }
  return host.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(
    /^_+|_+$/g,
    "",
  ) || "host";
};

const evaluateGatewaysForHost = async (host) => {
  const slug = slugForHost(host);
  record(`tonsite_gateway_host_${slug}`, host || "");
  if (!host) {
    record(`tonsite_gateway_lookup_${slug}`, "SKIPPED");
    return { slug, status: "SKIPPED" };
  }
  if (candidateGateways.length === 0) {
    record(`tonsite_gateway_lookup_${slug}`, "SKIPPED");
    return { slug, status: "SKIPPED" };
  }

  let gatewayStatus = "FAIL";
  let firstPreview = "";
  let firstStatus = 0;
  let firstTransport = "";
  let firstUrl = "";
  let successfulGateway = null;

  const encodedHost = encodeURIComponent(host);
  for (let i = 0; i < candidateGateways.length; i += 1) {
    const base = candidateGateways[i]?.replace(/\/+$/, "");
    if (!base) {
      continue;
    }
    const url = `${base}/${encodedHost}`;
    const label = `tonsite_gateway_${slug}_candidate${i}`;
    const result = await fetchWithCurlFallback(url, {
      label,
      timeoutMs: 8000,
    });
    const preview = sanitize(result.body).slice(0, 240);
    if (!firstUrl) {
      firstUrl = url;
      firstStatus = result.status ?? 0;
      firstTransport = result.transport ?? "";
      firstPreview = preview;
    }
    record(`${label}_url`, url);
    if (result.status) {
      record(`${label}_http_status`, result.status);
    }
    if (result.transport) {
      record(`${label}_transport`, result.transport);
    }
    if (preview) {
      record(`${label}_preview`, preview);
    }

    const lowerPreview = preview.toLowerCase();
    const flaggedFailure = gatewayFailureIndicators.some((indicator) =>
      lowerPreview.includes(indicator)
    );

    if (result.ok && !flaggedFailure) {
      const byteLength = Buffer.byteLength(result.body, "utf8");
      successfulGateway = {
        url,
        status: result.status,
        transport: result.transport,
        preview,
        bytes: byteLength,
      };
      break;
    }
  }

  if (successfulGateway) {
    gatewayStatus = "PASS";
    record(`tonsite_gateway_lookup_${slug}`, gatewayStatus);
    record(`tonsite_gateway_source_${slug}`, successfulGateway.url);
    if (successfulGateway.status) {
      record(`tonsite_gateway_http_status_${slug}`, successfulGateway.status);
    }
    if (successfulGateway.transport) {
      record(`tonsite_gateway_transport_${slug}`, successfulGateway.transport);
    }
    if (successfulGateway.preview) {
      record(`tonsite_gateway_preview_${slug}`, successfulGateway.preview);
    }
    record(`tonsite_gateway_bytes_${slug}`, successfulGateway.bytes);
  } else {
    if (firstStatus) {
      gatewayStatus = "FAIL";
      record(`tonsite_gateway_http_status_${slug}`, firstStatus);
    } else {
      gatewayStatus = "ERROR";
    }
    if (firstTransport) {
      record(`tonsite_gateway_transport_${slug}`, firstTransport);
    }
    if (firstPreview) {
      record(`tonsite_gateway_error_${slug}`, firstPreview);
    }
    if (firstUrl) {
      record(`tonsite_gateway_source_${slug}`, firstUrl);
    }
    record(`tonsite_gateway_lookup_${slug}`, gatewayStatus);
  }

  return {
    slug,
    status: gatewayStatus,
    successfulGateway,
    firstStatus,
    firstTransport,
    firstPreview,
    firstUrl,
  };
};

let rootResult = null;
const gatewayResults = [];
for (const host of hostsToProbe) {
  const result = await evaluateGatewaysForHost(host);
  gatewayResults.push(result);
  if (result.slug === "root") {
    rootResult = result;
  }
}

if (gatewayResults.length > 0) {
  const summary = gatewayResults
    .map((result) => `${result.slug}:${result.status}`)
    .join(",");
  record("tonsite_gateway_summary", summary);
}

if (rootResult) {
  record("tonsite_gateway_lookup", rootResult.status);
  if (rootResult.successfulGateway) {
    record("tonsite_gateway_source", rootResult.successfulGateway.url);
    if (rootResult.successfulGateway.status) {
      record(
        "tonsite_gateway_http_status",
        rootResult.successfulGateway.status,
      );
    }
    if (rootResult.successfulGateway.transport) {
      record(
        "tonsite_gateway_transport",
        rootResult.successfulGateway.transport,
      );
    }
    if (rootResult.successfulGateway.preview) {
      record("tonsite_gateway_preview", rootResult.successfulGateway.preview);
    }
    record("tonsite_gateway_bytes", rootResult.successfulGateway.bytes);
  } else {
    if (rootResult.firstStatus) {
      record("tonsite_gateway_http_status", rootResult.firstStatus);
    }
    if (rootResult.firstTransport) {
      record("tonsite_gateway_transport", rootResult.firstTransport);
    }
    if (rootResult.firstPreview) {
      record("tonsite_gateway_error", rootResult.firstPreview);
    }
    if (rootResult.firstUrl) {
      record("tonsite_gateway_source", rootResult.firstUrl);
    }
  }
} else if (!domain) {
  record("tonsite_gateway_lookup", "SKIPPED");
}

console.log(lines.join("\n"));
