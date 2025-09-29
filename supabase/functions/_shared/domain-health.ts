import { getServiceClient } from "./client.ts";
import {
  buildHealthReport,
  guardHealthRequest,
  healthResponse,
  type HealthStatus,
  measureHealthCheck,
} from "./health.ts";
import { registerHandler } from "./serve.ts";

interface TableConfig {
  name: string;
  description?: string;
  optional?: boolean;
}

interface EdgeFunctionConfig {
  name: string;
  description?: string;
  endpoint?: string;
}

interface DatasetConfig {
  prefix: string;
  description?: string;
  noun?: string;
  optional?: boolean;
  emptyMessage?: string;
  healthyMessage?: string;
  emptyStatus?: HealthStatus;
  healthyStatus?: HealthStatus;
}

interface DomainHealthConfig {
  domain: string;
  tables: readonly TableConfig[];
  dataset?: DatasetConfig;
  description: string;
  edgeFunctions?: readonly EdgeFunctionConfig[];
  telemetry?: readonly string[];
  notes?: readonly string[];
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
    dataset,
    description,
    edgeFunctions = [],
    telemetry = [],
    notes = [],
  } = config;

  const datasetConfig = dataset;
  const mirrorNoun = datasetConfig?.noun ?? "mirrored objects";
  const mirrorEmptyStatus = datasetConfig?.emptyStatus ??
    (datasetConfig?.optional ? "warning" : "error");
  const mirrorHealthyStatus = datasetConfig?.healthyStatus ?? "healthy";

  return registerHandler(async (req) => {
    const guard = guardHealthRequest(req, ["GET"]);
    if (guard) return guard;

    const supabase = getServiceClient();

    const tableChecks = tables.map((table) =>
      measureHealthCheck(`table:${table.name}`, async () => {
        const { count, error } = await supabase
          .from(table.name)
          .select("*", { count: "exact", head: true });

        if (error) {
          return {
            status: "error" as const,
            message: `Failed to query ${table.name}: ${error.message}`,
          };
        }

        const { status, message } = describeCount(count, "rows");
        return {
          status,
          message: `${table.name} reachable. ${message}`,
          metadata: {
            table: table.name,
            description: table.description,
            optional: table.optional ?? false,
            rows: count ?? 0,
          },
        };
      })
    );

    const manifestCheck = datasetConfig
      ? measureHealthCheck("onedrive:mirror", async () => {
        const { data, count, error } = await supabase
          .from("one_drive_assets")
          .select("object_key,last_modified", { count: "exact" })
          .ilike("object_key", `${datasetConfig.prefix}%`)
          .limit(1);

        if (error) {
          return {
            status: "error" as const,
            message: `Mirror query failed: ${error.message}`,
          };
        }

        const total = count ?? data?.length ?? 0;
        const sample = data?.[0];
        if (total === 0) {
          return {
            status: mirrorEmptyStatus,
            message: datasetConfig.emptyMessage ??
              describeCount(total, mirrorNoun).message,
            metadata: {
              prefix: datasetConfig.prefix,
              description: datasetConfig.description,
              optional: datasetConfig.optional ?? false,
              objects: 0,
            },
          };
        }

        return {
          status: mirrorHealthyStatus,
          message: datasetConfig.healthyMessage ??
            describeCount(total, mirrorNoun).message,
          metadata: {
            prefix: datasetConfig.prefix,
            description: datasetConfig.description,
            optional: datasetConfig.optional ?? false,
            objects: total,
            sample: sample
              ? {
                object_key: sample.object_key,
                last_modified: sample.last_modified,
              }
              : undefined,
          },
        };
      })
      : null;

    const checks = manifestCheck
      ? await Promise.all([...tableChecks, manifestCheck])
      : await Promise.all(tableChecks);

    const report = buildHealthReport(checks, {
      metadata: {
        domain,
        description,
        connectivity: {
          tables: tables.map((table) => ({
            name: table.name,
            description: table.description,
            optional: table.optional ?? false,
          })),
          dataset: datasetConfig
            ? {
              prefix: datasetConfig.prefix,
              description: datasetConfig.description,
              optional: datasetConfig.optional ?? false,
              noun: datasetConfig.noun,
            }
            : undefined,
          edge_functions: edgeFunctions.map((fn) => ({
            name: fn.name,
            description: fn.description,
            endpoint: fn.endpoint,
          })),
          telemetry,
          notes,
        },
      },
    });

    return healthResponse(report, req, ["GET"]);
  });
}
