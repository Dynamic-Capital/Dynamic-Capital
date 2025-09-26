import { PrometheusSerializer } from "@opentelemetry/exporter-prometheus";
import { prometheusExporter } from "@/instrumentation";

const serializer = new PrometheusSerializer("", false);

export const dynamic = "force-dynamic";

export async function GET() {
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
