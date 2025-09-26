import { type Attributes, metrics } from "@opentelemetry/api";

const SERVICE_NAME = "dynamic-capital-web";

const meter = metrics.getMeter(SERVICE_NAME);

const httpRequestDurationSeconds = meter.createHistogram(
  "http_request_duration_seconds",
  {
    description:
      "Distribution of server API request durations used for latency SLOs.",
    unit: "s",
  },
);

const httpRequestsTotal = meter.createCounter("http_requests_total", {
  description: "Total number of HTTP requests processed by the web API.",
});

const httpRequestErrorsTotal = meter.createCounter(
  "http_request_errors_total",
  {
    description:
      "Total number of HTTP requests that resulted in server-side errors.",
  },
);

const httpRequestsInFlight = meter.createUpDownCounter(
  "http_requests_in_flight",
  {
    description: "Current number of in-flight HTTP requests being processed.",
  },
);

type Handler = () => Response | Promise<Response>;

function now(): bigint {
  if (typeof process !== "undefined" && typeof process.hrtime === "function") {
    return process.hrtime.bigint();
  }

  const time = typeof performance !== "undefined"
    ? performance.now()
    : Date.now();
  return BigInt(Math.round(time * 1_000_000));
}

function durationSeconds(start: bigint): number {
  const end = now();
  return Number(end - start) / 1_000_000_000;
}

export async function withApiMetrics(
  req: Request,
  route: string,
  handler: Handler,
): Promise<Response> {
  const baseAttributes: Attributes = { route, method: req.method };

  httpRequestsInFlight.add(1, baseAttributes);
  const start = now();

  try {
    const response = await handler();
    const status = response.status.toString();
    const observedAttributes: Attributes = {
      ...baseAttributes,
      status,
    };
    const seconds = durationSeconds(start);

    httpRequestsTotal.add(1, observedAttributes);
    httpRequestDurationSeconds.record(seconds, observedAttributes);
    if (response.status >= 500) {
      httpRequestErrorsTotal.add(1, observedAttributes);
    }

    return response;
  } catch (error) {
    const seconds = durationSeconds(start);
    const observedAttributes: Attributes = {
      ...baseAttributes,
      status: "exception",
    };

    httpRequestsTotal.add(1, observedAttributes);
    httpRequestDurationSeconds.record(seconds, observedAttributes);
    httpRequestErrorsTotal.add(1, observedAttributes);

    throw error;
  } finally {
    httpRequestsInFlight.add(-1, baseAttributes);
  }
}
