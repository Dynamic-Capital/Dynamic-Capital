import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { isIP, Socket } from "node:net";
import { lookup } from "node:dns/promises";
import { Agent, request } from "undici";

interface ValidatorRecord {
  status: string;
  public_key_base64: string;
  ip_address: string;
  verified_at: string;
  verifier: string;
}

interface CheckResult {
  name: string;
  ok: boolean;
  detail?: string;
}

interface ValidatorResult {
  record: ValidatorRecord;
  checks: CheckResult[];
}

interface Report {
  run_at: string;
  verifier_domain: {
    domain: string;
    dns_lookup: CheckResult;
    https_head: CheckResult;
  };
  validators: ValidatorResult[];
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "../..");
const datasetPath = resolve(
  projectRoot,
  "data/orbs_validator_verifications.json",
);
const reportPath = resolve(
  projectRoot,
  "data/orbs_mainnet_verification_report.json",
);

function isValidBase64(value: string): boolean {
  if (!/^[A-Za-z0-9+/=]+$/.test(value)) {
    return false;
  }
  try {
    const decoded = Buffer.from(value, "base64");
    const reEncoded = decoded.toString("base64");
    return value.replace(/=+$/, "") === reEncoded.replace(/=+$/, "");
  } catch (error) {
    return false;
  }
}

async function checkDns(domain: string): Promise<CheckResult> {
  try {
    const result = await lookup(domain);
    return {
      name: "dns_lookup",
      ok: Boolean(result?.address),
      detail: result?.address,
    };
  } catch (error) {
    return {
      name: "dns_lookup",
      ok: false,
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}

const httpsAgent = new Agent({
  connect: {
    rejectUnauthorized: false,
    timeout: 5_000,
  },
  headersTimeout: 5_000,
  bodyTimeout: 5_000,
});

async function checkHttpsHead(domain: string): Promise<CheckResult> {
  try {
    const response = await request(`https://${domain}`, {
      method: "HEAD",
      dispatcher: httpsAgent,
      maxRedirections: 2,
      headers: {
        "user-agent": "dynamic-capital-orbs-verifier/1.0",
        accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });

    await response.body?.cancel();

    return {
      name: "https_head",
      ok: response.statusCode < 500,
      detail: `HTTP ${response.statusCode}`,
    };
  } catch (error) {
    const detail = error instanceof Error && error.message
      ? error.message
      : JSON.stringify(error);
    return {
      name: "https_head",
      ok: false,
      detail,
    };
  }
}

async function checkTcpConnectivity(
  host: string,
  port: number,
  timeoutMs = 5_000,
): Promise<CheckResult> {
  return await new Promise<CheckResult>((resolve) => {
    const socket = new Socket();

    const onError = (error: Error): void => {
      cleanup();
      resolve({
        name: `tcp_${port}`,
        ok: false,
        detail: error.message,
      });
    };

    const onTimeout = (): void => {
      cleanup();
      resolve({
        name: `tcp_${port}`,
        ok: false,
        detail: "connection timeout",
      });
    };

    const onConnect = (): void => {
      cleanup();
      resolve({
        name: `tcp_${port}`,
        ok: true,
        detail: "connection established",
      });
    };

    const cleanup = (): void => {
      socket.removeListener("error", onError);
      socket.removeListener("timeout", onTimeout);
      socket.removeListener("connect", onConnect);
      socket.destroy();
    };

    socket.setTimeout(timeoutMs);
    socket.once("error", onError);
    socket.once("timeout", onTimeout);
    socket.once("connect", onConnect);

    socket.connect({ host, port });
  });
}

async function run(): Promise<void> {
  const raw = await readFile(datasetPath, "utf8");
  const parsed = JSON.parse(raw) as unknown;

  if (!Array.isArray(parsed)) {
    throw new Error("The dataset must be an array of validator records.");
  }

  const records = parsed as ValidatorRecord[];

  const runAt = new Date().toISOString();

  const domain = records[0]?.verifier ?? "orbs.com";

  records.forEach((record, index) => {
    const requiredFields: (keyof ValidatorRecord)[] = [
      "status",
      "public_key_base64",
      "ip_address",
      "verified_at",
      "verifier",
    ];

    const missingFields = requiredFields.filter((field) => !(field in record));
    if (missingFields.length > 0) {
      throw new Error(
        `Record at index ${index} is missing required fields: ${
          missingFields.join(", ")
        }`,
      );
    }

    const nonStringFields = requiredFields.filter((field) =>
      typeof record[field] !== "string" || record[field].trim() === ""
    );

    if (nonStringFields.length > 0) {
      throw new Error(
        `Record at index ${index} has invalid field types: ${
          nonStringFields.join(", ")
        }`,
      );
    }
  });

  const [dnsCheck, httpsCheck] = await Promise.all([
    checkDns(domain),
    checkHttpsHead(domain),
  ]);

  const validators: ValidatorResult[] = await Promise.all(
    records.map(async (record) => {
      const checks: CheckResult[] = [];

      checks.push({
        name: "schema_status",
        ok: record.status?.toLowerCase() === "verified",
        detail: record.status,
      });

      checks.push({
        name: "base64_format",
        ok: isValidBase64(record.public_key_base64),
      });

      const ipValid = isIP(record.ip_address) === 4;
      checks.push({
        name: "ip_format",
        ok: ipValid,
        detail: record.ip_address,
      });

      const date = new Date(record.verified_at);
      const dateValid = !Number.isNaN(date.valueOf()) && date <= new Date();
      const dateDetail = dateValid ? date.toISOString() : record.verified_at;
      checks.push({
        name: "verified_at_past",
        ok: dateValid,
        detail: dateDetail,
      });

      if (ipValid) {
        const [tcp443, tcp80] = await Promise.all([
          checkTcpConnectivity(record.ip_address, 443),
          checkTcpConnectivity(record.ip_address, 80),
        ]);
        checks.push(tcp443, tcp80);
      } else {
        checks.push(
          {
            name: "tcp_443",
            ok: false,
            detail: "skipped due to invalid IP",
          },
          {
            name: "tcp_80",
            ok: false,
            detail: "skipped due to invalid IP",
          },
        );
      }

      return { record, checks };
    }),
  );

  const report: Report = {
    run_at: runAt,
    verifier_domain: {
      domain,
      dns_lookup: dnsCheck,
      https_head: httpsCheck,
    },
    validators,
  };

  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  const summary = validators.map(({ record, checks }) => ({
    public_key: record.public_key_base64,
    ip: record.ip_address,
    failures: checks.filter((check) => !check.ok).map((check) =>
      `${check.name}: ${check.detail ?? "failed"}`
    ),
  }));

  console.log("Orbs mainnet verification run at", runAt);
  console.table(summary);
  console.log(`Detailed report written to ${reportPath}`);
}

run()
  .catch((error) => {
    console.error("Failed to run Orbs mainnet verification:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await httpsAgent.close();
  });
