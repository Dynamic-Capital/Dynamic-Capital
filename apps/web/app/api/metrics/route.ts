import type { PrometheusSerializer } from "@opentelemetry/exporter-prometheus";
import { getPrometheusExporter } from "@/instrumentation";

const isNodeRuntime = typeof process !== "undefined" &&
  !!process.versions?.node;

let serializerPromise: Promise<PrometheusSerializer | undefined> | undefined;

async function getSerializer() {
  if (serializerPromise) {
    return serializerPromise;
  }

  if (!isNodeRuntime) {
    serializerPromise = Promise.resolve(undefined);
    return serializerPromise;
  }

  serializerPromise = import(
    /* webpackIgnore: true */ "@opentelemetry/exporter-prometheus"
  )
    .then((module: typeof import("@opentelemetry/exporter-prometheus")) =>
      new module.PrometheusSerializer("", false)
    )
    .catch(() => undefined);

  return serializerPromise;
}

export const dynamic = "force-dynamic";

export async function GET() {
  const [prometheusExporter, serializer] = await Promise.all([
    getPrometheusExporter(),
    getSerializer(),
  ]);

  if (!prometheusExporter || !serializer) {
    return new Response("# metrics exporter unavailable", {
      status: 503,
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "no-store",
      },
    });
  }

  try {
    const { resourceMetrics } = await prometheusExporter.collect();
    const body = serializer.serialize(resourceMetrics);
    return new Response(body, {
      status: 200,
      headers: {
        "content-type": "text/plain; version=0.0.4; charset=utf-8",
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    const message = `# failed to collect metrics: ${String(error)}`;
    return new Response(message, {
      status: 500,
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "no-store",
      },
    });
  }
}
