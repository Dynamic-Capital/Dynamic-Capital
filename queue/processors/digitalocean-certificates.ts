import type { JobRecord, ProcessorMap } from "../index.ts";

const API_BASE_URL = "https://api.digitalocean.com/v2";

interface CertificatePayload {
  domain: string;
  certificateId?: string;
  dnsNames?: string[];
  certificateName?: string;
}

interface DigitalOceanCertificate {
  id: string;
  state?: string;
  name?: string;
  dns_names?: string[];
  state_message?: string;
}

interface CertificateResponse {
  certificate?: DigitalOceanCertificate;
}

function getEnv(name: string): string | undefined {
  if (typeof process !== "undefined" && typeof process.env !== "undefined") {
    const value = process.env[name];
    if (value !== undefined) return value;
  }
  if (typeof Deno !== "undefined") {
    try {
      const value = Deno.env?.get?.(name);
      if (value !== undefined) return value;
    } catch (_) {
      // ignore when env access is not permitted
    }
  }
  return undefined;
}

function assertToken(): string {
  const token = getEnv("DIGITALOCEAN_TOKEN");
  if (!token) {
    throw new Error("DigitalOcean API token missing. Set DIGITALOCEAN_TOKEN.");
  }
  return token;
}

function normalisePayload(raw: unknown): CertificatePayload {
  if (!raw || typeof raw !== "object") {
    throw new Error("digitalocean.certificate payload must be an object");
  }
  const payload = raw as Partial<CertificatePayload>;
  const domain = typeof payload.domain === "string"
    ? payload.domain.trim()
    : "";
  if (!domain) {
    throw new Error("digitalocean.certificate payload requires a domain");
  }
  const dnsNames = Array.isArray(payload.dnsNames)
    ? payload.dnsNames.map((name) => String(name ?? "").trim()).filter(Boolean)
    : undefined;
  const certificateId = typeof payload.certificateId === "string"
    ? payload.certificateId.trim()
    : undefined;
  const certificateName = typeof payload.certificateName === "string"
    ? payload.certificateName.trim()
    : undefined;
  return { domain, dnsNames, certificateId, certificateName };
}

function deriveDnsNames(domain: string, provided?: string[]): string[] {
  const defaults = [domain, `www.${domain}`, `api.${domain}`];
  const names = provided && provided.length > 0 ? provided : defaults;
  const unique = new Set(names.map((name) => name.trim()).filter(Boolean));
  return Array.from(unique);
}

async function apiRequest<T>(
  path: string,
  token: string,
  init: RequestInit,
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    let detail = `${response.status}`;
    try {
      const body = await response.json();
      const message = body?.message ?? body?.error;
      if (typeof message === "string" && message.trim()) {
        detail += ` ${message.trim()}`;
      }
    } catch (_) {
      // ignore JSON parse errors
    }
    throw new Error(`DigitalOcean request failed: ${detail}`);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return await response.json() as T;
}

async function createCertificate(
  token: string,
  payload: CertificatePayload,
): Promise<DigitalOceanCertificate> {
  const dnsNames = deriveDnsNames(payload.domain, payload.dnsNames);
  const name = payload.certificateName ?? payload.domain;
  const body = {
    name,
    type: "lets_encrypt",
    dns_names: dnsNames,
  };
  const result = await apiRequest<CertificateResponse>("/certificates", token, {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!result.certificate?.id) {
    throw new Error("DigitalOcean API did not return a certificate id");
  }
  return result.certificate;
}

async function fetchCertificate(
  token: string,
  certificateId: string,
): Promise<DigitalOceanCertificate> {
  const result = await apiRequest<CertificateResponse>(
    `/certificates/${certificateId}`,
    token,
    { method: "GET" },
  );
  if (!result.certificate?.id) {
    throw new Error("DigitalOcean API response missing certificate");
  }
  return result.certificate;
}

function shouldContinuePolling(state: string | undefined): boolean {
  if (!state) return true;
  const pendingStates = [
    "pending",
    "pending_validation",
    "issuing",
    "creating",
  ];
  return pendingStates.includes(state.toLowerCase());
}

function isIssued(state: string | undefined): boolean {
  if (!state) return false;
  const successStates = ["issued", "verified", "completed"];
  return successStates.includes(state.toLowerCase());
}

function formatStateError(
  certificate: DigitalOceanCertificate,
): string {
  const state = certificate.state ?? "unknown";
  const message = certificate.state_message ?? "";
  return message
    ? `Certificate ${certificate.id} failed (${state}): ${message}`
    : `Certificate ${certificate.id} failed with state ${state}`;
}

async function handleCertificateJob(
  rawPayload: unknown,
  job: JobRecord,
): Promise<void> {
  const token = assertToken();
  const payload = normalisePayload(rawPayload);
  const workingPayload = job.payload as Partial<CertificatePayload>;

  if (!payload.certificateId) {
    const certificate = await createCertificate(token, payload);
    if (workingPayload && typeof workingPayload === "object") {
      workingPayload.certificateId = certificate.id;
    }
    throw new Error(
      `Certificate ${certificate.id} pending validation for ${payload.domain}`,
    );
  }

  const certificate = await fetchCertificate(token, payload.certificateId);
  if (isIssued(certificate.state)) {
    return;
  }

  if (shouldContinuePolling(certificate.state)) {
    throw new Error(
      `Certificate ${certificate.id} still pending (${
        certificate.state ?? "unknown"
      })`,
    );
  }

  throw new Error(formatStateError(certificate));
}

export function createDigitalOceanCertificateProcessors(): ProcessorMap {
  return {
    "digitalocean.certificate": async (payload, job) => {
      await handleCertificateJob(payload, job);
    },
  };
}
