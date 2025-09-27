import type { ResourcePlan } from "./resource-schema.ts";

export const resourcePlan: ResourcePlan = {
  tables: [
    {
      schema: "public",
      name: "infrastructure_jobs",
      comment:
        "Tracks automated infrastructure tasks so operators can audit resource updates.",
      columns: [
        {
          name: "id",
          type: "uuid",
          nullable: false,
          default: "gen_random_uuid()",
          comment: "Unique job identifier.",
        },
        {
          name: "created_at",
          type: "timestamptz",
          nullable: false,
          default: "now()",
          comment: "Timestamp when the job was enqueued.",
        },
        {
          name: "updated_at",
          type: "timestamptz",
          nullable: false,
          default: "now()",
          comment: "Timestamp when the job last changed state.",
        },
        {
          name: "state",
          type: "text",
          nullable: false,
          comment:
            "Lifecycle state for the job (queued, running, completed, failed).",
        },
        {
          name: "resource_type",
          type: "text",
          nullable: false,
          comment:
            "Supabase resource category affected by the job (database, storage, auth, function).",
        },
        {
          name: "resource_name",
          type: "text",
          nullable: false,
          comment: "Human readable identifier for the resource being modified.",
        },
        {
          name: "payload",
          type: "jsonb",
          nullable: false,
          comment: "JSON payload describing the desired resource changes.",
        },
        {
          name: "error",
          type: "text",
          comment: "Optional error details captured on failure.",
        },
      ],
      primaryKey: {
        columns: ["id"],
      },
      indexes: [
        {
          name: "infrastructure_jobs_state_idx",
          expression: "(state)",
        },
        {
          name: "infrastructure_jobs_resource_idx",
          expression: "(resource_type, resource_name)",
        },
        {
          name: "infrastructure_jobs_created_idx",
          expression: "(created_at DESC)",
        },
      ],
      rowLevelSecurity: {
        enable: true,
        force: true,
      },
      policies: [
        {
          name: "infrastructure_jobs_service_read",
          command: "SELECT",
          roles: ["service_role"],
          using: "true",
          comment:
            "Allow the service role to read job metadata for orchestration.",
        },
        {
          name: "infrastructure_jobs_service_manage",
          command: "ALL",
          roles: ["service_role"],
          using: "true",
          withCheck: "true",
          comment: "Permit the service role to manage job lifecycles.",
        },
      ],
      postDeploymentSql: [
        "ALTER TABLE public.infrastructure_jobs ALTER COLUMN updated_at SET DEFAULT now();",
        "CREATE OR REPLACE FUNCTION public.set_infrastructure_job_updated_at()\nRETURNS TRIGGER\nLANGUAGE plpgsql AS $$\nBEGIN\n  NEW.updated_at := now();\n  RETURN NEW;\nEND;\n$$;",
        "DROP TRIGGER IF EXISTS infrastructure_jobs_set_updated_at ON public.infrastructure_jobs;",
        "CREATE TRIGGER infrastructure_jobs_set_updated_at\nBEFORE UPDATE ON public.infrastructure_jobs\nFOR EACH ROW EXECUTE FUNCTION public.set_infrastructure_job_updated_at();",
      ],
    },
    {
      schema: "public",
      name: "routine_prompts",
      comment:
        "Dynamic AI generated routine prompts that power notifications and daily cards.",
      columns: [
        {
          name: "id",
          type: "uuid",
          nullable: false,
          default: "gen_random_uuid()",
          comment: "Unique identifier for the routine prompt entry.",
        },
        {
          name: "time_slot",
          type: "text",
          nullable: false,
          comment: "Time label associated with the scheduled routine block.",
        },
        {
          name: "category",
          type: "text",
          comment:
            "High-level category assigned by Dynamic AI (Prayer, Trading, etc.).",
        },
        {
          name: "title",
          type: "text",
          comment:
            "Display title for the scheduled block derived from the blueprint.",
        },
        {
          name: "tip",
          type: "text",
          comment: "Practical checklist-style advice for the block.",
        },
        {
          name: "quote",
          type: "text",
          comment: "Motivational or faith-based quote paired with the routine.",
        },
        {
          name: "notification",
          type: "text",
          comment: "Short push notification copy combining title and tip cues.",
        },
        {
          name: "created_at",
          type: "timestamptz",
          nullable: false,
          default: "now()",
          comment: "Timestamp when the routine prompt was generated.",
        },
      ],
      primaryKey: {
        columns: ["id"],
      },
      indexes: [
        {
          name: "routine_prompts_time_slot_idx",
          expression: "(time_slot)",
          unique: true,
        },
      ],
      rowLevelSecurity: {
        enable: true,
        force: true,
      },
      policies: [
        {
          name: "routine_prompts_service_all",
          command: "ALL",
          roles: ["service_role"],
          using: "true",
          withCheck: "true",
          comment:
            "Allow the service role to manage Dynamic AI routine prompts.",
        },
        {
          name: "routine_prompts_authenticated_read",
          command: "SELECT",
          roles: ["authenticated"],
          using: "true",
          comment:
            "Permit authenticated users to read the published routine prompts.",
        },
      ],
    },
  ],
  storage: {
    enableRowLevelSecurity: true,
    forceRowLevelSecurity: true,
  },
  storageBuckets: [
    {
      name: "infrastructure-artifacts",
      public: false,
      allowedMimeTypes: [
        "application/json",
        "application/yaml",
        "application/pdf",
        "image/png",
        "image/jpeg",
      ],
      fileSizeLimit: 10485760,
      comment: "Artifacts, logs, and exports generated by automation jobs.",
    },
  ],
  storagePolicies: [
    {
      name: "infrastructure_artifacts_service_manage",
      bucket: "infrastructure-artifacts",
      command: "ALL",
      roles: ["service_role"],
      using: "true",
      withCheck: "true",
      comment: "Allow the service role to manage all automation artifacts.",
    },
    {
      name: "infrastructure_artifacts_read_authenticated",
      bucket: "infrastructure-artifacts",
      command: "SELECT",
      roles: ["authenticated"],
      using:
        "storage.foldername(name) = 'public' OR storage.foldername(name) = auth.uid()::text",
      comment:
        "Authenticated users can read their own folder or shared public assets.",
    },
  ],
};

export default resourcePlan;
