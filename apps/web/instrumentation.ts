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

type ResourceInstance = {
  merge(other: ResourceInstance): ResourceInstance;
};

type ResourceConstructor = {
  default(): ResourceInstance;
  new (attributes: Record<string, unknown>): ResourceInstance;
};

type MeterProviderConstructor = new (options: {
  resource: ResourceInstance;
  readers: unknown[];
  views: unknown[];
}) => MeterProvider;

type ViewConstructor = new (options: {
  instrumentName: string;
  instrumentType: unknown;
  aggregation: unknown;
}) => unknown;

type ExplicitBucketHistogramAggregationConstructor = new (
  boundaries: number[],
) => unknown;

type InstrumentTypeLike = {
  HISTOGRAM: unknown;
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

  const dynamicImport = new Function(
    "specifier",
    "return import(specifier);",
  ) as <T>(specifier: string) => Promise<T>;

  type ModuleWithPossibleDefault = Record<string, unknown> & {
    default?: Record<string, unknown> | undefined;
  };

  function resolveModuleExport<T>(
    module: ModuleWithPossibleDefault,
    exportName: string,
  ): T | undefined {
    const directExport = module[exportName];
    if (directExport !== undefined) {
      return directExport as T;
    }

    const defaultExport = module.default;
    if (
      defaultExport &&
      typeof defaultExport === "object" &&
      exportName in defaultExport &&
      defaultExport[exportName] !== undefined
    ) {
      return defaultExport[exportName] as T;
    }

    return undefined;
  }

  const modulePaths = {
    exporterPrometheus: [
      "@opentelemetry",
      "exporter-prometheus",
    ].join("/"),
    sdkMetrics: ["@opentelemetry", "sdk-metrics"].join("/"),
    instrumentation: ["@opentelemetry", "instrumentation"].join("/"),
    instrumentationHttp: [
      "@opentelemetry",
      "instrumentation-http",
    ].join("/"),
    instrumentationFetch: [
      "@opentelemetry",
      "instrumentation-fetch",
    ].join("/"),
    resources: ["@opentelemetry", "resources"].join("/"),
    semanticConventions: [
      "@opentelemetry",
      "semantic-conventions",
    ].join("/"),
  } as const;

  async function ensurePrometheusExporter() {
    if (telemetryState.prometheusExporter) {
      return telemetryState.prometheusExporter;
    }

    if (!isNodeRuntime) {
      return undefined;
    }

    try {
      const module = await dynamicImport<
        typeof import("@opentelemetry/exporter-prometheus")
      >(modulePaths.exporterPrometheus);
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
    sdkMetricsModulePromise ??= dynamicImport<
      typeof import("@opentelemetry/sdk-metrics")
    >(modulePaths.sdkMetrics);
    return sdkMetricsModulePromise;
  }

  async function loadInstrumentationModule() {
    instrumentationModulePromise ??= dynamicImport<
      typeof import("@opentelemetry/instrumentation")
    >(modulePaths.instrumentation);
    return instrumentationModulePromise;
  }

  async function loadHttpInstrumentationModule() {
    httpInstrumentationModulePromise ??= dynamicImport<
      typeof import("@opentelemetry/instrumentation-http")
    >(modulePaths.instrumentationHttp);
    return httpInstrumentationModulePromise;
  }

  async function loadFetchInstrumentationModule() {
    fetchInstrumentationModulePromise ??= dynamicImport<
      typeof import("@opentelemetry/instrumentation-fetch")
    >(modulePaths.instrumentationFetch);
    return fetchInstrumentationModulePromise;
  }

  async function loadResourcesModule() {
    resourcesModulePromise ??= dynamicImport<
      typeof import("@opentelemetry/resources")
    >(modulePaths.resources);
    return resourcesModulePromise;
  }

  async function loadSemanticConventionsModule() {
    semanticConventionsModulePromise ??= dynamicImport<
      typeof import("@opentelemetry/semantic-conventions")
    >(modulePaths.semanticConventions);
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

    function fallbackToExistingMeterProvider(
      message: string,
      error?: unknown,
    ) {
      if (!telemetryState.meterProvider) {
        telemetryState.meterProvider = metrics
          .getMeterProvider() as unknown as MeterProvider;
      }
      if (!isProduction) {
        console.warn("[telemetry]", message, error);
      }
    }

    let registerInstrumentations:
      InstrumentationModule["registerInstrumentations"];
    let HttpInstrumentation: HttpInstrumentationModule["HttpInstrumentation"];
    let FetchInstrumentation:
      FetchInstrumentationModule["FetchInstrumentation"];
    try {
      const [
        instrumentationModule,
        httpInstrumentationModule,
        fetchInstrumentationModule,
      ] = await Promise.all([
        loadInstrumentationModule(),
        loadHttpInstrumentationModule(),
        loadFetchInstrumentationModule(),
      ]);

      registerInstrumentations = resolveModuleExport<
        InstrumentationModule["registerInstrumentations"]
      >(
        instrumentationModule as ModuleWithPossibleDefault,
        "registerInstrumentations",
      )!;
      HttpInstrumentation = resolveModuleExport<
        HttpInstrumentationModule["HttpInstrumentation"]
      >(
        httpInstrumentationModule as ModuleWithPossibleDefault,
        "HttpInstrumentation",
      )!;
      FetchInstrumentation = resolveModuleExport<
        FetchInstrumentationModule["FetchInstrumentation"]
      >(
        fetchInstrumentationModule as ModuleWithPossibleDefault,
        "FetchInstrumentation",
      )!;
    } catch (error) {
      fallbackToExistingMeterProvider(
        "Failed to load OpenTelemetry instrumentation modules",
        error,
      );
      return;
    }

    if (
      typeof registerInstrumentations !== "function" ||
      typeof HttpInstrumentation !== "function" ||
      typeof FetchInstrumentation !== "function"
    ) {
      fallbackToExistingMeterProvider(
        "OpenTelemetry instrumentation exports are unavailable",
      );
      return;
    }

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

    let metricsModule: SDKMetricsModule;
    let resourcesModule: ResourcesModule;
    let semanticConventionsModule: SemanticConventionsModule;
    try {
      [metricsModule, resourcesModule, semanticConventionsModule] =
        await Promise.all([
          loadSDKMetricsModule(),
          loadResourcesModule(),
          loadSemanticConventionsModule(),
        ]);
    } catch (error) {
      fallbackToExistingMeterProvider(
        "Failed to load OpenTelemetry SDK modules",
        error,
      );
      return;
    }

    const { SemanticResourceAttributes } = semanticConventionsModule;

    const metricsExports = metricsModule as ModuleWithPossibleDefault;
    const meterProviderCtor = resolveModuleExport<MeterProviderConstructor>(
      metricsExports,
      "MeterProvider",
    );
    const instrumentType = resolveModuleExport<InstrumentTypeLike>(
      metricsExports,
      "InstrumentType",
    );
    const viewCtor = resolveModuleExport<ViewConstructor>(
      metricsExports,
      "View",
    );
    const explicitBucketHistogramAggregationCtor = resolveModuleExport<
      ExplicitBucketHistogramAggregationConstructor
    >(
      metricsExports,
      "ExplicitBucketHistogramAggregation",
    );

    if (
      typeof meterProviderCtor !== "function" ||
      typeof viewCtor !== "function" ||
      typeof explicitBucketHistogramAggregationCtor !== "function" ||
      typeof instrumentType !== "object" ||
      instrumentType === null
    ) {
      fallbackToExistingMeterProvider(
        "OpenTelemetry metrics SDK exports are unavailable",
      );
      return;
    }

    const resourceExports = resourcesModule as ModuleWithPossibleDefault;
    const resourceCtor = resolveModuleExport<ResourceConstructor>(
      resourceExports,
      "Resource",
    );

    if (typeof resourceCtor !== "function") {
      fallbackToExistingMeterProvider(
        "OpenTelemetry resources SDK exports are unavailable",
      );
      return;
    }

    const SDKMeterProvider = meterProviderCtor as MeterProviderConstructor;
    const InstrumentType = instrumentType as InstrumentTypeLike;
    const View = viewCtor as ViewConstructor;
    const ExplicitBucketHistogramAggregation =
      explicitBucketHistogramAggregationCtor as ExplicitBucketHistogramAggregationConstructor;

    const Resource = resourceCtor as ResourceConstructor;

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
