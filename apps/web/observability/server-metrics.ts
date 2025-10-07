import type {
  Attributes as OtelAttributes,
  Context,
  Counter,
  Histogram,
  UpDownCounter,
} from "@opentelemetry/api";

const SERVICE_NAME = "dynamic-capital-web";

export type Attributes = OtelAttributes;

type CounterLike = Pick<Counter<OtelAttributes>, "add">;
type HistogramLike = Pick<Histogram<OtelAttributes>, "record">;
type UpDownCounterLike = Pick<UpDownCounter<OtelAttributes>, "add">;

export interface ApiMetricsInstrumentation {
  httpRequestDurationSeconds: HistogramLike;
  httpRequestsTotal: CounterLike;
  httpRequestErrorsTotal: CounterLike;
  httpRequestsInFlight: UpDownCounterLike;
}

export const API_METRICS_OVERRIDE_SYMBOL = Symbol.for(
  "dynamic-capital.observability.metrics.override",
);

const noopInstrumentation: ApiMetricsInstrumentation = {
  httpRequestDurationSeconds: { record: () => {} },
  httpRequestsTotal: { add: () => {} },
  httpRequestErrorsTotal: { add: () => {} },
  httpRequestsInFlight: { add: () => {} },
};

export function createNoopApiMetrics(): ApiMetricsInstrumentation {
  return noopInstrumentation;
}

let cachedInstrumentation: ApiMetricsInstrumentation | null = null;
let instrumentationPromise: Promise<ApiMetricsInstrumentation> | null = null;

async function resolveApiInstrumentation(): Promise<ApiMetricsInstrumentation> {
  const override = (globalThis as Record<PropertyKey, unknown>)[
    API_METRICS_OVERRIDE_SYMBOL
  ];
  if (override) {
    return override as ApiMetricsInstrumentation;
  }

  if (cachedInstrumentation) {
    return cachedInstrumentation;
  }

  if (!instrumentationPromise) {
    instrumentationPromise = (async () => {
      try {
        const { metrics } = await import("@opentelemetry/api");
        const meter = metrics.getMeter(SERVICE_NAME);
        const instrumentation: ApiMetricsInstrumentation = {
          httpRequestDurationSeconds: meter.createHistogram(
            "http_request_duration_seconds",
            {
              description:
                "Distribution of server API request durations used for latency SLOs.",
              unit: "s",
            },
          ),
          httpRequestsTotal: meter.createCounter("http_requests_total", {
            description:
              "Total number of HTTP requests processed by the web API.",
          }),
          httpRequestErrorsTotal: meter.createCounter(
            "http_request_errors_total",
            {
              description:
                "Total number of HTTP requests that resulted in server-side errors.",
            },
          ),
          httpRequestsInFlight: meter.createUpDownCounter(
            "http_requests_in_flight",
            {
              description:
                "Current number of in-flight HTTP requests being processed.",
            },
          ),
        };
        cachedInstrumentation = instrumentation;
        return instrumentation;
      } catch (error) {
        console.warn(
          "OpenTelemetry metrics unavailable, falling back to no-op instrumentation.",
          error,
        );
        return noopInstrumentation;
      }
    })();
  }

  const instrumentation = await instrumentationPromise;
  cachedInstrumentation = instrumentation;
  return instrumentation;
}

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
  req: Request | undefined,
  route: string,
  handler: Handler,
): Promise<Response> {
  const {
    httpRequestDurationSeconds,
    httpRequestErrorsTotal,
    httpRequestsInFlight,
    httpRequestsTotal,
  } = await resolveApiInstrumentation();

  const method = req?.method ?? "GET";
  const baseAttributes: Attributes = { route, method };

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
