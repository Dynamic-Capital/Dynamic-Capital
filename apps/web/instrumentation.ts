import { metrics } from "@opentelemetry/api";
import type { MeterProvider } from "@opentelemetry/sdk-metrics";
import type { PrometheusExporter } from "@opentelemetry/exporter-prometheus";
import { isProduction } from "@/config/node-env";

const SERVICE_NAME = "dynamic-capital-web";

type TelemetryState = {
  meterProvider?: MeterProvider;
  sentryInitialized?: boolean;
  prometheusExporter?: PrometheusExporter;
};

type SentryFacade = {
  init?: (options: Record<string, unknown>) => void;
  getCurrentHub?: () => { getClient?: () => unknown } | undefined;
};

const globalTelemetryState = globalThis as typeof globalThis & {
  __dynamicCapitalTelemetry?: TelemetryState;
};

globalTelemetryState.__dynamicCapitalTelemetry ??= {};

const telemetryState = globalTelemetryState.__dynamicCapitalTelemetry;

let getPrometheusExporterImpl: () => Promise<PrometheusExporter | undefined> =
  async () => undefined;

const registerImpl: () => Promise<void> = (() => {
  if (process.env.NEXT_RUNTIME === "edge") {
    getPrometheusExporterImpl = async () => undefined;

    return async function registerEdgeRuntime() {
      if (telemetryState.meterProvider) {
        return;
      }

      telemetryState.meterProvider = metrics
        .getMeterProvider() as unknown as MeterProvider;
    };
  }

  const isNodeRuntime = typeof process !== "undefined" &&
    !!process.versions?.node;

  async function ensurePrometheusExporter() {
    if (telemetryState.prometheusExporter) {
      return telemetryState.prometheusExporter;
    }

    if (!isNodeRuntime) {
      return undefined;
    }

    try {
      const module = (await import(
        /* webpackIgnore: true */ "@opentelemetry/exporter-prometheus"
      )) as typeof import("@opentelemetry/exporter-prometheus");
      const exporter = new module.PrometheusExporter({
        preventServerStart: true,
        appendTimestamp: false,
      });
      telemetryState.prometheusExporter = exporter;
      return exporter;
    } catch (error) {
      if (!isProduction) {
        console.warn(
          "[telemetry] Failed to initialise Prometheus exporter",
          error,
        );
      }
      return undefined;
    }
  }

  getPrometheusExporterImpl = ensurePrometheusExporter;

  type SDKMetricsModule = typeof import("@opentelemetry/sdk-metrics");
  type InstrumentationModule = typeof import("@opentelemetry/instrumentation");
  type HttpInstrumentationModule =
    typeof import("@opentelemetry/instrumentation-http");
  type FetchInstrumentationModule =
    typeof import("@opentelemetry/instrumentation-fetch");
  type ResourcesModule = typeof import("@opentelemetry/resources");
  type SemanticConventionsModule =
    typeof import("@opentelemetry/semantic-conventions");

  let sdkMetricsModulePromise: Promise<SDKMetricsModule> | undefined;
  let instrumentationModulePromise: Promise<InstrumentationModule> | undefined;
  let httpInstrumentationModulePromise:
    | Promise<HttpInstrumentationModule>
    | undefined;
  let fetchInstrumentationModulePromise:
    | Promise<FetchInstrumentationModule>
    | undefined;
  let resourcesModulePromise: Promise<ResourcesModule> | undefined;
  let semanticConventionsModulePromise:
    | Promise<SemanticConventionsModule>
    | undefined;

  async function loadSDKMetricsModule() {
    sdkMetricsModulePromise ??= import(
      /* webpackIgnore: true */ "@opentelemetry/sdk-metrics"
    );
    return sdkMetricsModulePromise;
  }

  async function loadInstrumentationModule() {
    instrumentationModulePromise ??= import(
      /* webpackIgnore: true */ "@opentelemetry/instrumentation"
    );
    return instrumentationModulePromise;
  }

  async function loadHttpInstrumentationModule() {
    httpInstrumentationModulePromise ??= import(
      /* webpackIgnore: true */ "@opentelemetry/instrumentation-http"
    );
    return httpInstrumentationModulePromise;
  }

  async function loadFetchInstrumentationModule() {
    fetchInstrumentationModulePromise ??= import(
      /* webpackIgnore: true */ "@opentelemetry/instrumentation-fetch"
    );
    return fetchInstrumentationModulePromise;
  }

  async function loadResourcesModule() {
    resourcesModulePromise ??= import(
      /* webpackIgnore: true */ "@opentelemetry/resources"
    );
    return resourcesModulePromise;
  }

  async function loadSemanticConventionsModule() {
    semanticConventionsModulePromise ??= import(
      /* webpackIgnore: true */ "@opentelemetry/semantic-conventions"
    );
    return semanticConventionsModulePromise;
  }

  async function ensureMeterProvider() {
    if (telemetryState.meterProvider) {
      return;
    }

    if (!isNodeRuntime) {
      telemetryState.meterProvider = metrics
        .getMeterProvider() as unknown as MeterProvider;
      return;
    }

    try {
      const { registerOTel } = await import("@vercel/otel");
      registerOTel();
    } catch {
      // Optional dependency not installed; continue without Vercel helper.
    }

    const [
      { registerInstrumentations },
      { HttpInstrumentation },
      { FetchInstrumentation },
    ] = await Promise.all([
      loadInstrumentationModule(),
      loadHttpInstrumentationModule(),
      loadFetchInstrumentationModule(),
    ]);

    registerInstrumentations({
      instrumentations: [
        new HttpInstrumentation({
          ignoreIncomingRequestHook: (request) => {
            const url = request.url ?? "";
            return (
              url.startsWith("/_next/") ||
              url.startsWith("/static/") ||
              url.startsWith("/api/metrics")
            );
          },
          requireParentforOutgoingSpans: false,
        }),
        new FetchInstrumentation({ clearTimingResources: true }),
      ],
    });

    const [
      {
        ExplicitBucketHistogramAggregation,
        InstrumentType,
        MeterProvider: SDKMeterProvider,
        View,
      },
      { Resource },
      { SemanticResourceAttributes },
    ] = await Promise.all([
      loadSDKMetricsModule(),
      loadResourcesModule(),
      loadSemanticConventionsModule(),
    ]);

    const resource = Resource.default().merge(
      new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: SERVICE_NAME,
        [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]:
          process.env.VERCEL_ENV || process.env.NODE_ENV || "development",
      }),
    );

    const exporter = await ensurePrometheusExporter();
    const readers = exporter ? [exporter] : [];

    const meterProvider = new SDKMeterProvider({
      resource,
      readers,
      views: [
        new View({
          instrumentName: "http_request_duration_seconds",
          instrumentType: InstrumentType.HISTOGRAM,
          aggregation: new ExplicitBucketHistogramAggregation([
            0.05,
            0.1,
            0.25,
            0.5,
            1,
            2,
            5,
            10,
          ]),
        }),
      ],
    });

    metrics.setGlobalMeterProvider(meterProvider);
    telemetryState.meterProvider = meterProvider;
  }

  async function ensureSentry() {
    if (telemetryState.sentryInitialized) {
      return;
    }

    const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;
    if (!dsn) {
      return;
    }

    try {
      const sentryModule = typeof window === "undefined"
        ? await import(/* webpackIgnore: true */ "@sentry/nextjs")
        : await import(/* webpackIgnore: true */ "@sentry/browser");

      const sentry = ((sentryModule as { default?: unknown }).default ??
        sentryModule) as SentryFacade;

      const hub = typeof sentry.getCurrentHub === "function"
        ? sentry.getCurrentHub()
        : undefined;
      const hasClient = hub && typeof hub.getClient === "function"
        ? hub.getClient() !== null
        : false;

      if (typeof sentry.init === "function" && !hasClient) {
        sentry.init({
          dsn,
          environment: process.env.SENTRY_ENV ||
            process.env.VERCEL_ENV ||
            process.env.NODE_ENV ||
            "development",
          release: process.env.SENTRY_RELEASE ||
            process.env.VERCEL_GIT_COMMIT_SHA,
          enableTracing: true,
          tracesSampleRate: 1.0,
          profilesSampleRate: 1.0,
        });
      }

      telemetryState.sentryInitialized = true;
    } catch (error) {
      if (!isProduction) {
        console.warn("[telemetry] Failed to initialise Sentry", error);
      }
    }
  }

  return async function registerNodeRuntime() {
    await ensureMeterProvider();
    await ensureSentry();
  };
})();

export async function register() {
  await registerImpl();
}

export async function getPrometheusExporter() {
  return getPrometheusExporterImpl();
}
