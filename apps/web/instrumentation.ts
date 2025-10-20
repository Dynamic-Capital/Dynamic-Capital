import { metrics } from "@opentelemetry/api";
import type { MeterProvider } from "@opentelemetry/sdk-metrics";
import type { PrometheusExporter } from "@opentelemetry/exporter-prometheus";
import { isProduction } from "@/config/node-env";

type ProcessEnvLike = Record<string, string | undefined>;

type ProcessLike = {
  env?: ProcessEnvLike;
  versions?: { node?: string };
};

const processLike = typeof globalThis === "object" &&
    typeof (globalThis as { process?: unknown }).process === "object" &&
    (globalThis as { process?: unknown }).process !== null
  ? (globalThis as { process: ProcessLike }).process
  : undefined;

const processEnv: ProcessEnvLike = processLike?.env ?? {};
const nodeVersion = processLike?.versions?.node;

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

type InstrumentTypeLike = Record<string, unknown> & {
  HISTOGRAM: unknown;
};

type SDKMetricsExports = {
  MeterProvider: MeterProviderConstructor;
  View: ViewConstructor;
  ExplicitBucketHistogramAggregation:
    ExplicitBucketHistogramAggregationConstructor;
  InstrumentType: InstrumentTypeLike;
};

type SDKMetricsExportKey = keyof SDKMetricsExports;

type SDKMetricsExportGuards = {
  [Key in SDKMetricsExportKey]: (
    value: unknown,
  ) => value is SDKMetricsExports[Key];
};

const SDK_METRICS_EXPORT_GUARDS: SDKMetricsExportGuards = {
  MeterProvider: (value): value is MeterProviderConstructor =>
    typeof value === "function",
  View: (value): value is ViewConstructor => typeof value === "function",
  ExplicitBucketHistogramAggregation: (
    value,
  ): value is ExplicitBucketHistogramAggregationConstructor =>
    typeof value === "function",
  InstrumentType: (value): value is InstrumentTypeLike =>
    typeof value === "object" &&
    value !== null &&
    "HISTOGRAM" in (value as Record<string, unknown>),
};

const SDK_METRICS_EXPORT_KEYS = Object.keys(
  SDK_METRICS_EXPORT_GUARDS,
) as SDKMetricsExportKey[];

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
  () => Promise.resolve(undefined);

const registerImpl: () => Promise<void> = (() => {
  if (processEnv.NEXT_RUNTIME === "edge") {
    getPrometheusExporterImpl = () => Promise.resolve(undefined);

    return function registerEdgeRuntime(): Promise<void> {
      if (telemetryState.meterProvider) {
        return Promise.resolve();
      }

      telemetryState.meterProvider = metrics
        .getMeterProvider() as unknown as MeterProvider;
      return Promise.resolve();
    };
  }

  const isNodeRuntime = typeof nodeVersion === "string" &&
    nodeVersion.length > 0;

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

  type MetricsDiagnostics = Record<SDKMetricsExportKey, boolean>;

  function resolveSDKMetricsExports(
    module: ModuleWithPossibleDefault,
  ): { exports?: SDKMetricsExports; diagnostics: MetricsDiagnostics } {
    const diagnostics = SDK_METRICS_EXPORT_KEYS.reduce<MetricsDiagnostics>(
      (acc, key) => {
        acc[key] = false;
        return acc;
      },
      {} as MetricsDiagnostics,
    );

    const resolved: Partial<SDKMetricsExports> = {};

    for (const key of SDK_METRICS_EXPORT_KEYS) {
      const guard = SDK_METRICS_EXPORT_GUARDS[key];
      const candidate = resolveModuleExport<unknown>(module, key);

      if (guard(candidate)) {
        diagnostics[key] = true;
        (resolved as Record<SDKMetricsExportKey, unknown>)[key] = candidate;
      }
    }

    const hasAllExports = SDK_METRICS_EXPORT_KEYS.every((key) =>
      diagnostics[key]
    );

    return {
      exports: hasAllExports
        ? (resolved as Record<
          SDKMetricsExportKey,
          unknown
        > as SDKMetricsExports)
        : undefined,
      diagnostics,
    };
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

  function loadSDKMetricsModule(): Promise<SDKMetricsModule> {
    if (!sdkMetricsModulePromise) {
      sdkMetricsModulePromise = dynamicImport<
        typeof import("@opentelemetry/sdk-metrics")
      >(modulePaths.sdkMetrics);
    }
    return sdkMetricsModulePromise;
  }

  function loadInstrumentationModule(): Promise<InstrumentationModule> {
    if (!instrumentationModulePromise) {
      instrumentationModulePromise = dynamicImport<
        typeof import("@opentelemetry/instrumentation")
      >(modulePaths.instrumentation);
    }
    return instrumentationModulePromise;
  }

  function loadHttpInstrumentationModule(): Promise<HttpInstrumentationModule> {
    if (!httpInstrumentationModulePromise) {
      httpInstrumentationModulePromise = dynamicImport<
        typeof import("@opentelemetry/instrumentation-http")
      >(modulePaths.instrumentationHttp);
    }
    return httpInstrumentationModulePromise;
  }

  function loadFetchInstrumentationModule(): Promise<
    FetchInstrumentationModule
  > {
    if (!fetchInstrumentationModulePromise) {
      fetchInstrumentationModulePromise = dynamicImport<
        typeof import("@opentelemetry/instrumentation-fetch")
      >(modulePaths.instrumentationFetch);
    }
    return fetchInstrumentationModulePromise;
  }

  function loadResourcesModule(): Promise<ResourcesModule> {
    if (!resourcesModulePromise) {
      resourcesModulePromise = dynamicImport<
        typeof import("@opentelemetry/resources")
      >(modulePaths.resources);
    }
    return resourcesModulePromise;
  }

  function loadSemanticConventionsModule(): Promise<SemanticConventionsModule> {
    if (!semanticConventionsModulePromise) {
      semanticConventionsModulePromise = dynamicImport<
        typeof import("@opentelemetry/semantic-conventions")
      >(modulePaths.semanticConventions);
    }
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

    const {
      exports: resolvedMetricsExports,
      diagnostics: metricExportDiagnostics,
    } = resolveSDKMetricsExports(metricsExports);

    if (!resolvedMetricsExports) {
      fallbackToExistingMeterProvider(
        "OpenTelemetry metrics SDK exports are unavailable",
        {
          meterProviderAvailable: metricExportDiagnostics.MeterProvider,
          viewAvailable: metricExportDiagnostics.View,
          histogramAggregationAvailable:
            metricExportDiagnostics.ExplicitBucketHistogramAggregation,
          instrumentTypeAvailable: metricExportDiagnostics.InstrumentType,
        },
      );
      return;
    }

    const {
      MeterProvider: meterProviderCtor,
      View: viewCtor,
      ExplicitBucketHistogramAggregation:
        explicitBucketHistogramAggregationCtor,
      InstrumentType: instrumentType,
    } = resolvedMetricsExports;

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
          processEnv.VERCEL_ENV || processEnv.NODE_ENV || "development",
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

    const dsn = processEnv.SENTRY_DSN || processEnv.NEXT_PUBLIC_SENTRY_DSN;
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
          environment: processEnv.SENTRY_ENV ||
            processEnv.VERCEL_ENV ||
            processEnv.NODE_ENV ||
            "development",
          release: processEnv.SENTRY_RELEASE ||
            processEnv.VERCEL_GIT_COMMIT_SHA,
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

export function getPrometheusExporter() {
  return getPrometheusExporterImpl();
}
