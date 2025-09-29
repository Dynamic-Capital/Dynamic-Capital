import { getServiceClient } from "./client.ts";
import {
  buildHealthReport,
  guardHealthRequest,
  healthResponse,
  type HealthStatus,
  measureHealthCheck,
} from "./health.ts";
import { registerHandler } from "./serve.ts";

interface DomainHealthConfig {
  domain: string;
  tables: readonly string[];
  datasetPrefix: string;
  description: string;
  mirror?: {
    noun?: string;
    emptyMessage?: string;
    healthyMessage?: string;
    emptyStatus?: HealthStatus;
    healthyStatus?: HealthStatus;
  };
}

function describeCount(
  count: number | null,
  noun: string,
): { message: string; status: HealthStatus } {
  const total = count ?? 0;
  if (total > 0) {
    return {
      status: "healthy",
      message: `Found ${total} ${noun}`,
    };
  }
  return {
    status: "warning",
    message: `No ${noun} found`,
  };
}

export function createDomainHealthHandler(
  config: DomainHealthConfig,
) {
  const {
    domain,
    tables,
    datasetPrefix,
    description,
    mirror = {},
  } = config;

  const mirrorNoun = mirror.noun ?? "mirrored objects";
  const mirrorEmptyStatus = mirror.emptyStatus ?? "warning";
  const mirrorHealthyStatus = mirror.healthyStatus ?? "healthy";

  return registerHandler(async (req) => {
    const guard = guardHealthRequest(req, ["GET"]);
    if (guard) return guard;

    const supabase = getServiceClient();

    const tableChecks = tables.map((table) =>
      measureHealthCheck(`table:${table}`, async () => {
        const { count, error } = await supabase
          .from(table)
          .select("*", { count: "exact", head: true });

        if (error) {
          return {
            status: "error" as const,
            message: `Failed to query ${table}: ${error.message}`,
          };
        }

        const { status, message } = describeCount(count, "rows");
        return {
          status,
          message: `${table} reachable. ${message}`,
          metadata: { rows: count ?? 0 },
        };
      })
    );

    const manifestCheck = measureHealthCheck("onedrive:mirror", async () => {
      const { count, error } = await supabase
        .from("one_drive_assets")
        .select("object_key", { count: "exact", head: true })
        .ilike("object_key", `${datasetPrefix}%`);

      if (error) {
        return {
          status: "error" as const,
          message: `Mirror query failed: ${error.message}`,
        };
      }

      const total = count ?? 0;
      if (total === 0) {
        return {
          status: mirrorEmptyStatus,
          message: mirror.emptyMessage ??
            describeCount(total, mirrorNoun).message,
          metadata: {
            prefix: datasetPrefix,
            objects: 0,
          },
        };
      }

      return {
        status: mirrorHealthyStatus,
        message: mirror.healthyMessage ??
          describeCount(total, mirrorNoun).message,
        metadata: {
          prefix: datasetPrefix,
          objects: total,
        },
      };
    });

    const checks = await Promise.all([...tableChecks, manifestCheck]);

    const report = buildHealthReport(checks, {
      metadata: {
        domain,
        dataset_prefix: datasetPrefix,
        tables,
        description,
      },
    });

    return healthResponse(report, req, ["GET"]);
  });
}
