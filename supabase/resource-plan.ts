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
    {
      schema: "public",
      name: "school_courses",
      comment:
        "Top-level School of Pipsology modules that group lessons and define curriculum order.",
      columns: [
        {
          name: "id",
          type: "uuid",
          nullable: false,
          default: "gen_random_uuid()",
          comment: "Primary key for the course record.",
        },
        {
          name: "slug",
          type: "text",
          nullable: false,
          unique: true,
          comment: "URL-friendly identifier used for routing and linking.",
        },
        {
          name: "title",
          type: "text",
          nullable: false,
          comment: "Human readable title for the course.",
        },
        {
          name: "summary",
          type: "text",
          comment: "Short description displayed in course lists and previews.",
        },
        {
          name: "sequence",
          type: "integer",
          nullable: false,
          comment: "Ordering index for the curriculum progression.",
        },
        {
          name: "estimated_minutes",
          type: "integer",
          comment: "Approximate duration to complete the course content.",
        },
        {
          name: "start_url",
          type: "text",
          nullable: false,
          comment: "Canonical external URL where the course lessons begin.",
        },
        {
          name: "created_at",
          type: "timestamptz",
          nullable: false,
          default: "now()",
          comment: "Timestamp when the course was created in the system.",
        },
        {
          name: "updated_at",
          type: "timestamptz",
          nullable: false,
          default: "now()",
          comment: "Timestamp when the course metadata was last updated.",
        },
      ],
      primaryKey: {
        columns: ["id"],
      },
      indexes: [
        {
          name: "school_courses_sequence_idx",
          expression: "(sequence)",
        },
      ],
      rowLevelSecurity: {
        enable: true,
        force: true,
      },
      policies: [
        {
          name: "school_courses_service_manage",
          command: "ALL",
          roles: ["service_role"],
          using: "true",
          withCheck: "true",
          comment:
            "Allow the service role to manage School of Pipsology courses.",
        },
        {
          name: "school_courses_authenticated_read",
          command: "SELECT",
          roles: ["authenticated"],
          using: "true",
          comment: "Allow authenticated users to view course metadata.",
        },
        {
          name: "school_courses_anon_read",
          command: "SELECT",
          roles: ["anon"],
          using: "true",
          comment: "Allow anonymous visitors to preview course metadata.",
        },
      ],
      postDeploymentSql: [
        "ALTER TABLE public.school_courses ALTER COLUMN updated_at SET DEFAULT now();",
        "CREATE OR REPLACE FUNCTION public.set_school_courses_updated_at()\nRETURNS TRIGGER\nLANGUAGE plpgsql AS $$\nBEGIN\n  NEW.updated_at := now();\n  RETURN NEW;\nEND;\n$$;",
        "DROP TRIGGER IF EXISTS school_courses_set_updated_at ON public.school_courses;",
        "CREATE TRIGGER school_courses_set_updated_at\nBEFORE UPDATE ON public.school_courses\nFOR EACH ROW EXECUTE FUNCTION public.set_school_courses_updated_at();",
      ],
    },
    {
      schema: "public",
      name: "school_lessons",
      comment:
        "Individual lessons that belong to a School of Pipsology course.",
      columns: [
        {
          name: "id",
          type: "uuid",
          nullable: false,
          default: "gen_random_uuid()",
          comment: "Primary key for the lesson record.",
        },
        {
          name: "course_id",
          type: "uuid",
          nullable: false,
          references: {
            schema: "public",
            table: "school_courses",
            column: "id",
            onDelete: "CASCADE",
          },
          comment: "Foreign key back to the parent course.",
        },
        {
          name: "slug",
          type: "text",
          nullable: false,
          comment: "URL-friendly identifier for the lesson.",
        },
        {
          name: "title",
          type: "text",
          nullable: false,
          comment: "Lesson title displayed within the course outline.",
        },
        {
          name: "summary",
          type: "text",
          comment: "Optional supporting copy for the lesson entry.",
        },
        {
          name: "sequence",
          type: "integer",
          nullable: false,
          comment: "Ordering index of the lesson within its course.",
        },
        {
          name: "content_url",
          type: "text",
          comment: "External URL that hosts the lesson content.",
        },
        {
          name: "estimated_minutes",
          type: "integer",
          comment: "Approximate duration for completing the lesson.",
        },
        {
          name: "created_at",
          type: "timestamptz",
          nullable: false,
          default: "now()",
          comment: "Timestamp when the lesson was created.",
        },
        {
          name: "updated_at",
          type: "timestamptz",
          nullable: false,
          default: "now()",
          comment: "Timestamp when the lesson metadata last changed.",
        },
      ],
      primaryKey: {
        columns: ["id"],
      },
      indexes: [
        {
          name: "school_lessons_course_sequence_idx",
          expression: "(course_id, sequence)",
        },
        {
          name: "school_lessons_course_slug_key",
          expression: "(course_id, slug)",
          unique: true,
        },
      ],
      rowLevelSecurity: {
        enable: true,
        force: true,
      },
      policies: [
        {
          name: "school_lessons_service_manage",
          command: "ALL",
          roles: ["service_role"],
          using: "true",
          withCheck: "true",
          comment: "Allow the service role to manage lesson records.",
        },
        {
          name: "school_lessons_authenticated_read",
          command: "SELECT",
          roles: ["authenticated"],
          using: "true",
          comment: "Allow authenticated users to view lesson metadata.",
        },
        {
          name: "school_lessons_anon_read",
          command: "SELECT",
          roles: ["anon"],
          using: "true",
          comment: "Permit anonymous visitors to view lesson outlines.",
        },
      ],
      postDeploymentSql: [
        "ALTER TABLE public.school_lessons ALTER COLUMN updated_at SET DEFAULT now();",
        "CREATE OR REPLACE FUNCTION public.set_school_lessons_updated_at()\nRETURNS TRIGGER\nLANGUAGE plpgsql AS $$\nBEGIN\n  NEW.updated_at := now();\n  RETURN NEW;\nEND;\n$$;",
        "DROP TRIGGER IF EXISTS school_lessons_set_updated_at ON public.school_lessons;",
        "CREATE TRIGGER school_lessons_set_updated_at\nBEFORE UPDATE ON public.school_lessons\nFOR EACH ROW EXECUTE FUNCTION public.set_school_lessons_updated_at();",
      ],
    },
    {
      schema: "public",
      name: "course_progress",
      comment: "Tracks which School of Pipsology lessons a user has completed.",
      columns: [
        {
          name: "id",
          type: "uuid",
          nullable: false,
          default: "gen_random_uuid()",
          comment: "Primary key for the progress record.",
        },
        {
          name: "user_id",
          type: "uuid",
          nullable: false,
          references: {
            schema: "auth",
            table: "users",
            column: "id",
            onDelete: "CASCADE",
          },
          comment: "Supabase auth user that owns the progress entry.",
        },
        {
          name: "course_id",
          type: "uuid",
          nullable: false,
          references: {
            schema: "public",
            table: "school_courses",
            column: "id",
            onDelete: "CASCADE",
          },
          comment: "Course context for the completed lesson.",
        },
        {
          name: "lesson_id",
          type: "uuid",
          nullable: false,
          references: {
            schema: "public",
            table: "school_lessons",
            column: "id",
            onDelete: "CASCADE",
          },
          comment: "Foreign key to the completed lesson.",
        },
        {
          name: "status",
          type: "text",
          nullable: false,
          default: "completed",
          comment:
            "State of the lesson for the user (completed, in-progress, etc.).",
        },
        {
          name: "completed_at",
          type: "timestamptz",
          nullable: false,
          default: "now()",
          comment: "Timestamp when the lesson was marked completed.",
        },
        {
          name: "created_at",
          type: "timestamptz",
          nullable: false,
          default: "now()",
          comment: "Timestamp when the record was created.",
        },
        {
          name: "updated_at",
          type: "timestamptz",
          nullable: false,
          default: "now()",
          comment: "Timestamp when the record last changed.",
        },
      ],
      primaryKey: {
        columns: ["id"],
      },
      indexes: [
        {
          name: "course_progress_user_lesson_key",
          expression: "(user_id, lesson_id)",
          unique: true,
        },
        {
          name: "course_progress_user_course_idx",
          expression: "(user_id, course_id)",
        },
      ],
      rowLevelSecurity: {
        enable: true,
        force: true,
      },
      policies: [
        {
          name: "course_progress_service_manage",
          command: "ALL",
          roles: ["service_role"],
          using: "true",
          withCheck: "true",
          comment: "Allow background jobs to manage course progress entries.",
        },
        {
          name: "course_progress_select_own",
          command: "SELECT",
          roles: ["authenticated"],
          using: "(auth.uid() = user_id)",
          comment: "Users can read their own progress records.",
        },
        {
          name: "course_progress_insert_own",
          command: "INSERT",
          roles: ["authenticated"],
          withCheck: "(auth.uid() = user_id)",
          comment: "Users can insert progress entries for themselves.",
        },
        {
          name: "course_progress_update_own",
          command: "UPDATE",
          roles: ["authenticated"],
          using: "(auth.uid() = user_id)",
          withCheck: "(auth.uid() = user_id)",
          comment: "Users can update their own progress entries.",
        },
        {
          name: "course_progress_delete_own",
          command: "DELETE",
          roles: ["authenticated"],
          using: "(auth.uid() = user_id)",
          comment: "Users can remove their own progress entries.",
        },
      ],
      postDeploymentSql: [
        "ALTER TABLE public.course_progress ALTER COLUMN updated_at SET DEFAULT now();",
        "CREATE OR REPLACE FUNCTION public.set_course_progress_updated_at()\nRETURNS TRIGGER\nLANGUAGE plpgsql AS $$\nBEGIN\n  NEW.updated_at := now();\n  RETURN NEW;\nEND;\n$$;",
        "DROP TRIGGER IF EXISTS course_progress_set_updated_at ON public.course_progress;",
        "CREATE TRIGGER course_progress_set_updated_at\nBEFORE UPDATE ON public.course_progress\nFOR EACH ROW EXECUTE FUNCTION public.set_course_progress_updated_at();",
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
