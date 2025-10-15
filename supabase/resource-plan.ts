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
    {
      schema: "public",
      name: "users",
      comment:
        "Lightweight profile records that map Telegram accounts to conversion users.",
      columns: [
        {
          name: "id",
          type: "uuid",
          nullable: false,
          default: "gen_random_uuid()",
          comment: "Primary key for the conversion user profile.",
        },
        {
          name: "telegram_id",
          type: "text",
          unique: true,
          comment:
            "Telegram identifier linked to the Dynamic mini app session.",
        },
        {
          name: "tier",
          type: "text",
          nullable: false,
          default: "'tier_0'",
          comment: "Assigned KYC tier controlling order limits.",
        },
        {
          name: "risk_flags",
          type: "jsonb",
          nullable: false,
          default: "'[]'::jsonb",
          comment: "Compliance risk markers collected during reviews.",
        },
        {
          name: "created_at",
          type: "timestamptz",
          nullable: false,
          default: "now()",
          comment: "Timestamp when the profile row was created.",
        },
      ],
      primaryKey: {
        columns: ["id"],
      },
      checks: [
        {
          name: "users_tier_check",
          expression: "tier IN ('tier_0','tier_1','tier_2')",
        },
      ],
      rowLevelSecurity: {
        enable: true,
        force: true,
      },
      policies: [
        {
          name: "users_service_manage",
          command: "ALL",
          roles: ["service_role"],
          using: "true",
          withCheck: "true",
          comment:
            "Allow backend services to manage Telegram profile mappings.",
        },
      ],
    },
    {
      schema: "public",
      name: "orders",
      comment:
        "Fiat-to-DCT conversion orders awaiting payment confirmation and settlement.",
      columns: [
        {
          name: "id",
          type: "uuid",
          nullable: false,
          default: "gen_random_uuid()",
          comment: "Primary key for the conversion order.",
        },
        {
          name: "user_id",
          type: "uuid",
          nullable: false,
          references: {
            schema: "public",
            table: "users",
            column: "id",
          },
          comment: "Conversion user that initiated the order.",
        },
        {
          name: "amount_fiat",
          type: "numeric(18,2)",
          nullable: false,
          comment: "Fiat amount the user will transfer via bank rails.",
        },
        {
          name: "target_dct",
          type: "numeric(36,8)",
          nullable: false,
          comment:
            "Quoted quantity of DCT that will be delivered on settlement.",
        },
        {
          name: "status",
          type: "text",
          nullable: false,
          check:
            "status IN ('draft','pending','awaiting_payment','verifying','manual_review','settled','failed','cancelled')",
          comment: "Lifecycle state for the conversion order.",
        },
        {
          name: "reference_code",
          type: "text",
          nullable: false,
          unique: true,
          comment: "Human-visible payment reference shared with the user.",
        },
        {
          name: "quote_hash",
          type: "text",
          nullable: false,
          comment:
            "Hash of the pricing quote used to lock the conversion rate.",
        },
        {
          name: "expires_at",
          type: "timestamptz",
          nullable: false,
          comment:
            "Timestamp when the quote expires and payment is no longer guaranteed.",
        },
        {
          name: "pricing_locked_at",
          type: "timestamptz",
          nullable: false,
          default: "now()",
          comment: "Timestamp when the quote was locked for the user.",
        },
        {
          name: "created_at",
          type: "timestamptz",
          nullable: false,
          default: "now()",
          comment: "Timestamp when the order was created.",
        },
        {
          name: "updated_at",
          type: "timestamptz",
          nullable: false,
          default: "now()",
          comment: "Timestamp when the order last changed state.",
        },
      ],
      primaryKey: {
        columns: ["id"],
      },
      indexes: [
        {
          name: "orders_user_status_idx",
          expression: "(user_id, status)",
        },
        {
          name: "orders_reference_idx",
          expression: "(reference_code)",
        },
      ],
      rowLevelSecurity: {
        enable: true,
        force: true,
      },
      policies: [
        {
          name: "orders_service_manage",
          command: "ALL",
          roles: ["service_role"],
          using: "true",
          withCheck: "true",
          comment: "Allow trusted automation to manage order lifecycles.",
        },
        {
          name: "orders_authenticated_select",
          command: "SELECT",
          roles: ["authenticated"],
          using: "(user_id = auth.uid())",
          comment: "Authenticated users can view their own conversion orders.",
        },
      ],
      postDeploymentSql: [
        "ALTER TABLE public.orders ALTER COLUMN updated_at SET DEFAULT now();",
        "CREATE OR REPLACE FUNCTION public.orders_set_updated_at()\nRETURNS TRIGGER\nLANGUAGE plpgsql AS $$\nBEGIN\n  NEW.updated_at := now();\n  RETURN NEW;\nEND;\n$$;",
        "DROP TRIGGER IF EXISTS set_orders_updated_at ON public.orders;",
        "CREATE TRIGGER set_orders_updated_at\nBEFORE UPDATE ON public.orders\nFOR EACH ROW EXECUTE FUNCTION public.orders_set_updated_at();",
      ],
    },
    {
      schema: "public",
      name: "payment_references",
      comment:
        "Holds bank transfer reference codes that are assigned to active orders.",
      columns: [
        {
          name: "reference_code",
          type: "text",
          nullable: false,
          comment: "Payment memo string communicated to the user.",
        },
        {
          name: "order_id",
          type: "uuid",
          references: {
            schema: "public",
            table: "orders",
            column: "id",
          },
          comment: "Order that currently reserves the payment reference.",
        },
        {
          name: "status",
          type: "text",
          nullable: false,
          check: "status IN ('reserved','assigned','expired','consumed')",
          comment: "Lifecycle for the reference allocation.",
        },
        {
          name: "reserved_at",
          type: "timestamptz",
          nullable: false,
          default: "now()",
          comment: "Timestamp when the reference was reserved.",
        },
        {
          name: "consumed_at",
          type: "timestamptz",
          comment:
            "Timestamp when the reference was consumed during settlement.",
        },
      ],
      primaryKey: {
        columns: ["reference_code"],
      },
      indexes: [
        {
          name: "payment_references_order_unique",
          expression: "(order_id)",
          unique: true,
        },
      ],
      rowLevelSecurity: {
        enable: true,
        force: true,
      },
      policies: [
        {
          name: "payment_references_service_manage",
          command: "ALL",
          roles: ["service_role"],
          using: "true",
          withCheck: "true",
          comment: "Automation can manage payment reference lifecycles.",
        },
      ],
    },
    {
      schema: "public",
      name: "receipt_uploads",
      comment:
        "Normalized record of receipt files uploaded as payment evidence for orders.",
      columns: [
        {
          name: "id",
          type: "uuid",
          nullable: false,
          default: "gen_random_uuid()",
          comment: "Primary key for the uploaded receipt artifact.",
        },
        {
          name: "order_id",
          type: "uuid",
          nullable: false,
          references: {
            schema: "public",
            table: "orders",
            column: "id",
            onDelete: "CASCADE",
          },
          comment: "Order the receipt upload is associated with.",
        },
        {
          name: "storage_path",
          type: "text",
          nullable: false,
          comment: "Path inside Supabase Storage where the file resides.",
        },
        {
          name: "checksum_sha256",
          type: "text",
          nullable: false,
          comment: "SHA-256 checksum to deduplicate uploads.",
        },
        {
          name: "file_bytes",
          type: "bigint",
          nullable: false,
          comment: "File size in bytes for auditing limits.",
        },
        {
          name: "uploaded_by",
          type: "uuid",
          nullable: false,
          comment: "User that submitted the receipt file.",
        },
        {
          name: "uploaded_at",
          type: "timestamptz",
          nullable: false,
          default: "now()",
          comment: "Timestamp when the file was uploaded.",
        },
      ],
      primaryKey: {
        columns: ["id"],
      },
      indexes: [
        {
          name: "receipt_uploads_order_uploaded_by_key",
          expression: "(order_id, uploaded_by)",
          unique: true,
        },
      ],
      rowLevelSecurity: {
        enable: true,
        force: true,
      },
      policies: [
        {
          name: "receipt_uploads_service_manage",
          command: "ALL",
          roles: ["service_role"],
          using: "true",
          withCheck: "true",
          comment: "Allow automation to manage uploaded receipts.",
        },
        {
          name: "receipt_uploads_authenticated_select",
          command: "SELECT",
          roles: ["authenticated"],
          using: "(uploaded_by = auth.uid())",
          comment: "Users can view receipt uploads they submitted.",
        },
        {
          name: "receipt_uploads_authenticated_insert",
          command: "INSERT",
          roles: ["authenticated"],
          withCheck: "(uploaded_by = auth.uid())",
          comment: "Users may attach receipt uploads for their own orders.",
        },
      ],
    },
    {
      schema: "public",
      name: "bank_events_raw",
      comment:
        "Immutable store of raw webhook payloads received from partner banks.",
      columns: [
        {
          name: "id",
          type: "bigint",
          nullable: false,
          identity: "always",
          comment: "Sequence identifier for the inbound webhook payload.",
        },
        {
          name: "provider",
          type: "text",
          nullable: false,
          comment: "Bank or webhook provider that delivered the event.",
        },
        {
          name: "payload",
          type: "jsonb",
          nullable: false,
          comment: "Raw JSON payload as delivered by the provider.",
        },
        {
          name: "signature",
          type: "text",
          nullable: false,
          comment: "Signature string used to verify authenticity.",
        },
        {
          name: "received_at",
          type: "timestamptz",
          nullable: false,
          default: "now()",
          comment: "Timestamp when the webhook was processed.",
        },
        {
          name: "hash_sha256",
          type: "text",
          nullable: false,
          unique: true,
          comment: "Deterministic hash of the payload for de-duplication.",
        },
      ],
      primaryKey: {
        columns: ["id"],
        name: "bank_events_raw_pkey",
      },
      rowLevelSecurity: {
        enable: true,
        force: true,
      },
      policies: [
        {
          name: "bank_events_raw_service_manage",
          command: "ALL",
          roles: ["service_role"],
          using: "true",
          withCheck: "true",
          comment:
            "Allow secure ingestion workers to manage raw bank payloads.",
        },
      ],
    },
    {
      schema: "public",
      name: "bank_events_normalized",
      comment:
        "Structured bank transaction data extracted from raw webhook events.",
      columns: [
        {
          name: "id",
          type: "bigint",
          nullable: false,
          identity: "always",
          comment: "Primary key for the normalized bank event.",
        },
        {
          name: "raw_event_id",
          type: "bigint",
          nullable: false,
          references: {
            schema: "public",
            table: "bank_events_raw",
            column: "id",
            onDelete: "CASCADE",
          },
          comment: "Foreign key back to the raw webhook payload.",
        },
        {
          name: "reference_code",
          type: "text",
          nullable: false,
          comment: "Reference string parsed from the bank transfer memo.",
        },
        {
          name: "sender_account",
          type: "text",
          comment: "Account number reported by the sending bank.",
        },
        {
          name: "sender_name",
          type: "text",
          comment: "Name of the remitting customer.",
        },
        {
          name: "amount_fiat",
          type: "numeric(18,2)",
          nullable: false,
          comment: "Fiat amount received per the bank event.",
        },
        {
          name: "currency",
          type: "text",
          nullable: false,
          comment: "Currency of the bank transfer.",
        },
        {
          name: "transaction_date",
          type: "timestamptz",
          nullable: false,
          comment: "Timestamp when the bank recorded the transaction.",
        },
        {
          name: "status",
          type: "text",
          nullable: false,
          comment: "Normalization status for the matched payment.",
        },
      ],
      primaryKey: {
        columns: ["id"],
        name: "bank_events_normalized_pkey",
      },
      indexes: [
        {
          name: "bank_events_normalized_reference_unique",
          expression: "(reference_code, sender_account, transaction_date)",
          unique: true,
        },
        {
          name: "bank_events_normalized_ref_idx",
          expression: "(reference_code)",
        },
      ],
      rowLevelSecurity: {
        enable: true,
        force: true,
      },
      policies: [
        {
          name: "bank_events_normalized_service_manage",
          command: "ALL",
          roles: ["service_role"],
          using: "true",
          withCheck: "true",
          comment:
            "Allow secure ingestion workers to manage normalized events.",
        },
      ],
    },
    {
      schema: "public",
      name: "verification_logs",
      comment:
        "Rule evaluation trail that captures automated and manual payment checks.",
      columns: [
        {
          name: "id",
          type: "bigint",
          nullable: false,
          identity: "always",
          comment: "Primary key for the verification log entry.",
        },
        {
          name: "order_id",
          type: "uuid",
          nullable: false,
          references: {
            schema: "public",
            table: "orders",
            column: "id",
            onDelete: "CASCADE",
          },
          comment: "Order that the verification rule evaluated.",
        },
        {
          name: "rule_name",
          type: "text",
          nullable: false,
          comment: "Identifier for the verification rule or procedure.",
        },
        {
          name: "result",
          type: "text",
          nullable: false,
          check: "result IN ('pass','fail','manual_review')",
          comment: "Outcome of the verification rule.",
        },
        {
          name: "reviewer_id",
          type: "uuid",
          comment: "Optional reviewer that recorded the result.",
        },
        {
          name: "notes",
          type: "text",
          comment: "Additional context captured for the verification.",
        },
        {
          name: "created_at",
          type: "timestamptz",
          nullable: false,
          default: "now()",
          comment: "Timestamp when the verification log was recorded.",
        },
      ],
      primaryKey: {
        columns: ["id"],
      },
      indexes: [
        {
          name: "verification_logs_order_idx",
          expression: "(order_id, created_at DESC)",
        },
      ],
      rowLevelSecurity: {
        enable: true,
        force: true,
      },
      policies: [
        {
          name: "verification_logs_service_manage",
          command: "ALL",
          roles: ["service_role"],
          using: "true",
          withCheck: "true",
          comment: "Allow automation to manage verification evidence.",
        },
        {
          name: "verification_logs_authenticated_select",
          command: "SELECT",
          roles: ["authenticated"],
          using:
            "(order_id IN (SELECT id FROM public.orders WHERE user_id = auth.uid()))",
          comment:
            "Users can review verification history for their own orders.",
        },
      ],
    },
    {
      schema: "public",
      name: "treasury_transfers",
      comment:
        "Settlements executed by the treasury wallet to deliver DCT for orders.",
      columns: [
        {
          name: "id",
          type: "bigint",
          nullable: false,
          identity: "always",
          comment: "Primary key for the treasury transfer.",
        },
        {
          name: "order_id",
          type: "uuid",
          nullable: false,
          references: {
            schema: "public",
            table: "orders",
            column: "id",
            onDelete: "CASCADE",
          },
          comment: "Order that the transfer settles.",
        },
        {
          name: "tx_hash",
          type: "text",
          nullable: false,
          unique: true,
          comment: "Blockchain transaction hash for the settlement.",
        },
        {
          name: "signer_public_key",
          type: "text",
          nullable: false,
          comment: "Public key of the signer that authorized the transfer.",
        },
        {
          name: "amount_dct",
          type: "numeric(36,8)",
          nullable: false,
          comment: "Amount of DCT delivered to the user.",
        },
        {
          name: "fee_dct",
          type: "numeric(36,8)",
          default: "0",
          comment: "DCT paid in network fees for the settlement.",
        },
        {
          name: "network",
          type: "text",
          nullable: false,
          comment: "Blockchain network where the transfer was executed.",
        },
        {
          name: "settled_at",
          type: "timestamptz",
          nullable: false,
          default: "now()",
          comment: "Timestamp when the transfer settled on-chain.",
        },
      ],
      primaryKey: {
        columns: ["id"],
      },
      indexes: [
        {
          name: "treasury_transfers_order_idx",
          expression: "(order_id)",
        },
      ],
      rowLevelSecurity: {
        enable: true,
        force: true,
      },
      policies: [
        {
          name: "treasury_transfers_service_manage",
          command: "ALL",
          roles: ["service_role"],
          using: "true",
          withCheck: "true",
          comment: "Allow treasury automation to manage settlement records.",
        },
        {
          name: "treasury_transfers_authenticated_select",
          command: "SELECT",
          roles: ["authenticated"],
          using:
            "(order_id IN (SELECT id FROM public.orders WHERE user_id = auth.uid()))",
          comment: "Users can view settlement transfers for their orders.",
        },
      ],
    },
    {
      schema: "public",
      name: "accounting_ledger",
      comment:
        "Double-entry style ledger capturing fiat and token side effects per order.",
      columns: [
        {
          name: "id",
          type: "bigint",
          nullable: false,
          identity: "always",
          comment: "Primary key for the accounting entry.",
        },
        {
          name: "entry_type",
          type: "text",
          nullable: false,
          check: "entry_type IN ('fiat','token','fee','adjustment')",
          comment: "Category of ledger entry recorded.",
        },
        {
          name: "reference_id",
          type: "uuid",
          nullable: false,
          comment: "Identifier of the entity the ledger entry is linked to.",
        },
        {
          name: "reference_table",
          type: "text",
          nullable: false,
          comment:
            "Table name for the referenced entity (orders, treasury_transfers, etc.).",
        },
        {
          name: "debit",
          type: "numeric(36,8)",
          default: "0",
          comment: "Debit amount recorded for the entry.",
        },
        {
          name: "credit",
          type: "numeric(36,8)",
          default: "0",
          comment: "Credit amount recorded for the entry.",
        },
        {
          name: "currency",
          type: "text",
          nullable: false,
          comment: "Currency denomination for the ledger amounts.",
        },
        {
          name: "memo",
          type: "text",
          comment: "Optional contextual memo for auditors.",
        },
        {
          name: "occurred_at",
          type: "timestamptz",
          nullable: false,
          default: "now()",
          comment: "Timestamp when the ledger entry occurred.",
        },
      ],
      primaryKey: {
        columns: ["id"],
      },
      indexes: [
        {
          name: "accounting_ledger_reference_idx",
          expression: "(reference_table, reference_id)",
        },
      ],
      rowLevelSecurity: {
        enable: true,
        force: true,
      },
      policies: [
        {
          name: "accounting_ledger_service_manage",
          command: "ALL",
          roles: ["service_role"],
          using: "true",
          withCheck: "true",
          comment: "Allow finance automation to manage ledger postings.",
        },
      ],
    },
    {
      schema: "public",
      name: "audit_events",
      comment:
        "Immutable audit log capturing significant actions across the conversion pipeline.",
      columns: [
        {
          name: "id",
          type: "bigint",
          nullable: false,
          identity: "always",
          comment: "Primary key for the audit event.",
        },
        {
          name: "entity_type",
          type: "text",
          nullable: false,
          comment: "Domain entity category that triggered the audit entry.",
        },
        {
          name: "entity_id",
          type: "text",
          nullable: false,
          comment: "Identifier of the entity instance being audited.",
        },
        {
          name: "action",
          type: "text",
          nullable: false,
          comment: "Action verb describing what occurred.",
        },
        {
          name: "actor",
          type: "text",
          nullable: false,
          comment:
            "Actor that performed the action (user, automation, webhook).",
        },
        {
          name: "payload",
          type: "jsonb",
          comment: "Structured contextual metadata for the event.",
        },
        {
          name: "created_at",
          type: "timestamptz",
          nullable: false,
          default: "now()",
          comment: "Timestamp when the audit event was recorded.",
        },
      ],
      primaryKey: {
        columns: ["id"],
      },
      indexes: [
        {
          name: "audit_events_entity_idx",
          expression: "(entity_type, entity_id)",
        },
      ],
      rowLevelSecurity: {
        enable: true,
        force: true,
      },
      policies: [
        {
          name: "audit_events_service_manage",
          command: "ALL",
          roles: ["service_role"],
          using: "true",
          withCheck: "true",
          comment: "Allow secure automation to append audit trail entries.",
        },
      ],
    },
    {
      schema: "public",
      name: "cold_email_leads",
      comment:
        "Stores prospects queued for cold outreach along with lifecycle metadata.",
      columns: [
        {
          name: "id",
          type: "uuid",
          nullable: false,
          default: "gen_random_uuid()",
          comment: "Primary key for the lead record.",
        },
        {
          name: "created_at",
          type: "timestamptz",
          nullable: false,
          default: "now()",
          comment: "Timestamp when the lead was inserted.",
        },
        {
          name: "updated_at",
          type: "timestamptz",
          nullable: false,
          default: "now()",
          comment: "Timestamp when the lead last changed state.",
        },
        {
          name: "name",
          type: "text",
          comment: "Prospect full name.",
        },
        {
          name: "email",
          type: "text",
          nullable: false,
          comment: "Prospect email address.",
        },
        {
          name: "company",
          type: "text",
          comment: "Organisation associated with the lead.",
        },
        {
          name: "status",
          type: "text",
          nullable: false,
          default: "'new'",
          comment:
            "Lifecycle state for the lead (new, processing, sent, error, etc.).",
        },
        {
          name: "last_contacted",
          type: "timestamptz",
          comment: "When the last outbound email was attempted.",
        },
        {
          name: "metadata",
          type: "jsonb",
          default: "'{}'::jsonb",
          comment:
            "Optional enrichment payload used for template merge variables.",
        },
      ],
      primaryKey: {
        columns: ["id"],
      },
      indexes: [
        {
          name: "cold_email_leads_email_key",
          expression: "(email)",
          unique: true,
        },
        {
          name: "cold_email_leads_status_idx",
          expression: "(status)",
        },
        {
          name: "cold_email_leads_last_contacted_idx",
          expression: "(last_contacted DESC)",
        },
      ],
      rowLevelSecurity: {
        enable: true,
        force: true,
      },
      policies: [
        {
          name: "cold_email_leads_service_all",
          command: "ALL",
          roles: ["service_role"],
          using: "true",
          withCheck: "true",
          comment: "Allow server-side automation to manage cold email leads.",
        },
      ],
      postDeploymentSql: [
        "ALTER TABLE public.cold_email_leads ALTER COLUMN updated_at SET DEFAULT now();",
        "CREATE OR REPLACE FUNCTION public.set_cold_email_leads_updated_at()\nRETURNS TRIGGER\nLANGUAGE plpgsql AS $$\nBEGIN\n  NEW.updated_at := now();\n  RETURN NEW;\nEND;\n$$;",
        "DROP TRIGGER IF EXISTS cold_email_leads_set_updated_at ON public.cold_email_leads;",
        "CREATE TRIGGER cold_email_leads_set_updated_at\nBEFORE UPDATE ON public.cold_email_leads\nFOR EACH ROW EXECUTE FUNCTION public.set_cold_email_leads_updated_at();",
      ],
    },
    {
      schema: "public",
      name: "cold_email_templates",
      comment:
        "Reusable cold email templates with merge variables for personalisation.",
      columns: [
        {
          name: "id",
          type: "uuid",
          nullable: false,
          default: "gen_random_uuid()",
          comment: "Primary key for the template.",
        },
        {
          name: "created_at",
          type: "timestamptz",
          nullable: false,
          default: "now()",
          comment: "Timestamp when the template was created.",
        },
        {
          name: "updated_at",
          type: "timestamptz",
          nullable: false,
          default: "now()",
          comment: "Timestamp when the template was last updated.",
        },
        {
          name: "name",
          type: "text",
          comment: "Internal reference name for the template.",
        },
        {
          name: "subject",
          type: "text",
          nullable: false,
          comment: "Email subject line.",
        },
        {
          name: "body",
          type: "text",
          nullable: false,
          comment: "Email body content (HTML or plaintext).",
        },
        {
          name: "variables",
          type: "text[]",
          nullable: false,
          default: "'{}'::text[]",
          comment:
            "List of template merge variables (e.g. name, company, product).",
        },
        {
          name: "is_active",
          type: "boolean",
          nullable: false,
          default: "true",
          comment:
            "Toggle to enable or disable the template without deleting it.",
        },
      ],
      primaryKey: {
        columns: ["id"],
      },
      indexes: [
        {
          name: "cold_email_templates_active_idx",
          expression: "(is_active)",
        },
      ],
      rowLevelSecurity: {
        enable: true,
        force: true,
      },
      policies: [
        {
          name: "cold_email_templates_service_all",
          command: "ALL",
          roles: ["service_role"],
          using: "true",
          withCheck: "true",
          comment: "Allow automation workflows to manage email templates.",
        },
      ],
      postDeploymentSql: [
        "ALTER TABLE public.cold_email_templates ALTER COLUMN updated_at SET DEFAULT now();",
        "CREATE OR REPLACE FUNCTION public.set_cold_email_templates_updated_at()\nRETURNS TRIGGER\nLANGUAGE plpgsql AS $$\nBEGIN\n  NEW.updated_at := now();\n  RETURN NEW;\nEND;\n$$;",
        "DROP TRIGGER IF EXISTS cold_email_templates_set_updated_at ON public.cold_email_templates;",
        "CREATE TRIGGER cold_email_templates_set_updated_at\nBEFORE UPDATE ON public.cold_email_templates\nFOR EACH ROW EXECUTE FUNCTION public.set_cold_email_templates_updated_at();",
      ],
    },
    {
      schema: "public",
      name: "cold_email_events",
      comment:
        "Delivery log for cold email attempts including provider message ids and errors.",
      columns: [
        {
          name: "id",
          type: "uuid",
          nullable: false,
          default: "gen_random_uuid()",
          comment: "Primary key for the email event.",
        },
        {
          name: "created_at",
          type: "timestamptz",
          nullable: false,
          default: "now()",
          comment: "Timestamp when the event was recorded.",
        },
        {
          name: "lead_id",
          type: "uuid",
          nullable: false,
          references: {
            table: "cold_email_leads",
            column: "id",
            onDelete: "CASCADE",
          },
          comment: "Lead that received the email attempt.",
        },
        {
          name: "template_id",
          type: "uuid",
          nullable: true,
          references: {
            table: "cold_email_templates",
            column: "id",
            onDelete: "SET NULL",
          },
          comment: "Template used for the send.",
        },
        {
          name: "message_id",
          type: "text",
          comment: "Provider message identifier if available.",
        },
        {
          name: "status",
          type: "text",
          nullable: false,
          comment:
            "Delivery state reported by the provider (sent, error, bounced, etc.).",
        },
        {
          name: "error",
          type: "text",
          comment: "Optional error message when the send fails.",
        },
        {
          name: "sent_at",
          type: "timestamptz",
          nullable: false,
          default: "now()",
          comment: "Timestamp when the send attempt happened.",
        },
      ],
      primaryKey: {
        columns: ["id"],
      },
      indexes: [
        {
          name: "cold_email_events_lead_idx",
          expression: "(lead_id)",
        },
        {
          name: "cold_email_events_template_idx",
          expression: "(template_id)",
        },
        {
          name: "cold_email_events_status_idx",
          expression: "(status)",
        },
        {
          name: "cold_email_events_sent_at_idx",
          expression: "(sent_at DESC)",
        },
      ],
      rowLevelSecurity: {
        enable: true,
        force: true,
      },
      policies: [
        {
          name: "cold_email_events_service_all",
          command: "ALL",
          roles: ["service_role"],
          using: "true",
          withCheck: "true",
          comment: "Allow service automation to record cold email events.",
        },
      ],
    },
    {
      schema: "public",
      name: "trading_accounts",
      comment:
        "Catalog of MT5 and copier accounts that execution agents can target.",
      columns: [
        {
          name: "id",
          type: "uuid",
          nullable: false,
          default: "gen_random_uuid()",
          comment: "Primary identifier for the trading account.",
        },
        {
          name: "account_code",
          type: "text",
          nullable: false,
          unique: true,
          comment:
            "Human readable code shared with bridge workers (e.g. DEMO).",
        },
        {
          name: "display_name",
          type: "text",
          comment: "Optional label surfaced in dashboards and runbooks.",
        },
        {
          name: "broker",
          type: "text",
          comment: "Broker or liquidity venue that hosts the account.",
        },
        {
          name: "environment",
          type: "text",
          nullable: false,
          default: "'demo'::text",
          check: "environment in ('demo','live')",
          comment:
            "Execution environment flag used to route demo vs live traffic.",
        },
        {
          name: "status",
          type: "public.trading_account_status_enum",
          nullable: false,
          default: "'active'::public.trading_account_status_enum",
          comment:
            "Lifecycle state for the account (active, maintenance, disabled).",
        },
        {
          name: "metadata",
          type: "jsonb",
          nullable: false,
          default: "'{}'::jsonb",
          comment:
            "Arbitrary metadata including routing hints and bridge settings.",
        },
        {
          name: "last_heartbeat_at",
          type: "timestamptz",
          comment: "Timestamp of the last heartbeat received from the bridge.",
        },
        {
          name: "created_at",
          type: "timestamptz",
          nullable: false,
          default: "now()",
          comment: "Creation timestamp for the account record.",
        },
        {
          name: "updated_at",
          type: "timestamptz",
          nullable: false,
          default: "now()",
          comment: "Last update timestamp for the account record.",
        },
      ],
      primaryKey: {
        columns: ["id"],
      },
      indexes: [
        {
          name: "idx_trading_accounts_status_env",
          expression: "(status, environment)",
        },
      ],
      rowLevelSecurity: {
        enable: true,
      },
      postDeploymentSql: [
        "DROP TRIGGER IF EXISTS trg_trading_accounts_updated_at ON public.trading_accounts;",
        "CREATE TRIGGER trg_trading_accounts_updated_at\nBEFORE UPDATE ON public.trading_accounts\nFOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();",
      ],
    },
    {
      schema: "public",
      name: "signals",
      comment:
        "Normalized trade intents queued for Dynamic Trading Algo workers and manual mentors.",
      columns: [
        {
          name: "id",
          type: "uuid",
          nullable: false,
          default: "gen_random_uuid()",
          comment: "Primary identifier for the trading signal.",
        },
        {
          name: "alert_id",
          type: "text",
          nullable: false,
          unique: true,
          comment:
            "Unique identifier provided by the upstream alerting system.",
        },
        {
          name: "account_id",
          type: "uuid",
          references: {
            table: "trading_accounts",
            column: "id",
            onDelete: "SET NULL",
          },
          comment: "Optional execution account override for the signal.",
        },
        {
          name: "author_id",
          type: "uuid",
          references: {
            table: "users",
            column: "id",
            onDelete: "SET NULL",
          },
          comment:
            "Mentor or strategist that authored the signal when applicable.",
        },
        {
          name: "source",
          type: "text",
          nullable: false,
          default: "'tradingview'::text",
          comment: "Originating platform or service that produced the signal.",
        },
        {
          name: "symbol",
          type: "text",
          nullable: false,
          comment:
            "Market symbol routed to MT5 or downstream research dashboards.",
        },
        {
          name: "asset",
          type: "text",
          nullable: false,
          generatedExpression: "symbol",
          comment:
            "Computed alias that mirrors symbol for mentor facing views.",
        },
        {
          name: "timeframe",
          type: "text",
          comment: "Original timeframe attached to the alert (e.g. 15m, 1h).",
        },
        {
          name: "direction",
          type: "text",
          nullable: false,
          check: "direction in ('long','short','flat')",
          comment: "Direction the strategy should take (long, short, or flat).",
        },
        {
          name: "order_type",
          type: "text",
          nullable: false,
          default: "'market'::text",
          check: "order_type in ('market','limit','stop','stop_limit')",
          comment: "Order type requested by the originating system.",
        },
        {
          name: "status",
          type: "public.signal_status_enum",
          nullable: false,
          default: "'pending'::public.signal_status_enum",
          comment:
            "Lifecycle status of the signal as it moves through execution.",
        },
        {
          name: "priority",
          type: "integer",
          nullable: false,
          default: "0",
          comment: "Priority weight used when competing signals are queued.",
        },
        {
          name: "confidence",
          type: "numeric(5,2)",
          check:
            "confidence is null or (confidence >= 0 and confidence <= 100)",
          comment: "Optional mentor-provided conviction score for the setup.",
        },
        {
          name: "price",
          type: "numeric(18,6)",
          comment: "Reference price supplied with the signal when available.",
        },
        {
          name: "stops",
          type: "jsonb",
          comment: "Structured stop loss and take profit annotations.",
        },
        {
          name: "payload",
          type: "jsonb",
          nullable: false,
          default: "'{}'::jsonb",
          comment: "Raw normalized payload stored for auditing and replay.",
        },
        {
          name: "metadata",
          type: "jsonb",
          nullable: false,
          default: "'{}'::jsonb",
          comment: "Additional enrichment derived from Dynamic AI pipelines.",
        },
        {
          name: "notes",
          type: "text",
          comment: "Free-form context shared with operators and students.",
        },
        {
          name: "error_reason",
          type: "text",
          comment: "Latest error captured when execution fails or retries.",
        },
        {
          name: "next_poll_at",
          type: "timestamptz",
          nullable: false,
          default: "now()",
          comment: "Timestamp when workers should re-evaluate the signal.",
        },
        {
          name: "acknowledged_at",
          type: "timestamptz",
          comment: "When a worker last claimed the signal for processing.",
        },
        {
          name: "last_heartbeat_at",
          type: "timestamptz",
          comment:
            "Worker heartbeat timestamp ensuring the signal is still active.",
        },
        {
          name: "executed_at",
          type: "timestamptz",
          comment: "Timestamp when the signal reached an executed state.",
        },
        {
          name: "cancelled_at",
          type: "timestamptz",
          comment: "Timestamp when the signal was cancelled or invalidated.",
        },
        {
          name: "created_at",
          type: "timestamptz",
          nullable: false,
          default: "now()",
          comment: "Creation timestamp for the signal.",
        },
        {
          name: "updated_at",
          type: "timestamptz",
          nullable: false,
          default: "now()",
          comment: "Last update timestamp for the signal.",
        },
      ],
      primaryKey: {
        columns: ["id"],
      },
      indexes: [
        {
          name: "idx_signals_status_poll",
          expression: "(status, next_poll_at, priority DESC, created_at)",
          predicate: "status in ('pending','claimed','processing')",
        },
        {
          name: "idx_signals_account_status",
          expression: "(account_id, status)",
        },
      ],
      rowLevelSecurity: {
        enable: true,
      },
      policies: [
        {
          name: "signals_service_all",
          command: "ALL",
          roles: ["service_role"],
          using: "true",
          withCheck: "true",
          comment:
            "Allow the service role to orchestrate signal lifecycle transitions.",
        },
        {
          name: "signals_read_authenticated",
          command: "SELECT",
          roles: ["authenticated"],
          using: "true",
          comment: "Expose published signals to authenticated clients.",
        },
        {
          name: "signals_insert_mentors",
          command: "INSERT",
          roles: ["authenticated"],
          withCheck:
            "exists (select 1 from public.users u where u.id = coalesce(signals.author_id, auth.uid()) and (u.role in ('mentor','admin','operator','strategist') or auth.uid() = u.auth_user_id or auth.uid() = u.id))",
          comment:
            "Allow mentors and operators to publish manual signals while enforcing role checks.",
        },
      ],
      postDeploymentSql: [
        "ALTER TABLE public.signals REPLICA IDENTITY FULL;",
        "DROP TRIGGER IF EXISTS trg_signals_updated_at ON public.signals;",
        "CREATE TRIGGER trg_signals_updated_at\nBEFORE UPDATE ON public.signals\nFOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();",
      ],
    },
    {
      schema: "public",
      name: "signal_dispatches",
      comment:
        "Execution worker dispatch ledger used to coordinate MT5 bridge heartbeats.",
      columns: [
        {
          name: "id",
          type: "uuid",
          nullable: false,
          default: "gen_random_uuid()",
          comment: "Primary identifier for the dispatch record.",
        },
        {
          name: "signal_id",
          type: "uuid",
          nullable: false,
          references: {
            table: "signals",
            column: "id",
            onDelete: "CASCADE",
          },
          comment: "Signal claimed by the execution worker.",
        },
        {
          name: "worker_id",
          type: "text",
          nullable: false,
          comment: "Identifier reported by the MT5 bridge worker instance.",
        },
        {
          name: "status",
          type: "public.signal_dispatch_status_enum",
          nullable: false,
          default: "'claimed'::public.signal_dispatch_status_enum",
          comment: "Lifecycle status for the dispatch record.",
        },
        {
          name: "retry_count",
          type: "integer",
          nullable: false,
          default: "0",
          comment: "Number of times the signal has been claimed by workers.",
        },
        {
          name: "metadata",
          type: "jsonb",
          nullable: false,
          default: "'{}'::jsonb",
          comment: "Structured metadata persisted by bridge workers.",
        },
        {
          name: "claimed_at",
          type: "timestamptz",
          nullable: false,
          default: "now()",
          comment: "Timestamp when the signal was claimed.",
        },
        {
          name: "last_heartbeat_at",
          type: "timestamptz",
          comment: "Latest heartbeat timestamp recorded for the worker.",
        },
        {
          name: "completed_at",
          type: "timestamptz",
          comment: "When the worker reported completion for the signal.",
        },
        {
          name: "failed_at",
          type: "timestamptz",
          comment: "When the dispatch marked the signal as failed.",
        },
        {
          name: "created_at",
          type: "timestamptz",
          nullable: false,
          default: "now()",
          comment: "Creation timestamp for the dispatch record.",
        },
        {
          name: "updated_at",
          type: "timestamptz",
          nullable: false,
          default: "now()",
          comment: "Last update timestamp for the dispatch record.",
        },
      ],
      primaryKey: {
        columns: ["id"],
      },
      indexes: [
        {
          name: "idx_signal_dispatches_signal",
          expression: "(signal_id, created_at)",
        },
        {
          name: "idx_signal_dispatches_status",
          expression: "(status, claimed_at)",
        },
      ],
      rowLevelSecurity: {
        enable: true,
      },
      postDeploymentSql: [
        "DROP TRIGGER IF EXISTS trg_signal_dispatches_updated_at ON public.signal_dispatches;",
        "CREATE TRIGGER trg_signal_dispatches_updated_at\nBEFORE UPDATE ON public.signal_dispatches\nFOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();",
      ],
    },
    {
      schema: "public",
      name: "trades",
      comment:
        "Executed MT5 trade receipts linked back to originating signals.",
      columns: [
        {
          name: "id",
          type: "uuid",
          nullable: false,
          default: "gen_random_uuid()",
          comment: "Primary identifier for the trade record.",
        },
        {
          name: "signal_id",
          type: "uuid",
          references: {
            table: "signals",
            column: "id",
            onDelete: "SET NULL",
          },
          comment: "Signal that triggered the MT5 trade.",
        },
        {
          name: "account_id",
          type: "uuid",
          references: {
            table: "trading_accounts",
            column: "id",
            onDelete: "SET NULL",
          },
          comment: "Account used to execute the trade.",
        },
        {
          name: "mt5_ticket_id",
          type: "bigint",
          comment: "MT5 ticket identifier, kept unique for idempotent updates.",
        },
        {
          name: "status",
          type: "public.trade_status_enum",
          nullable: false,
          default: "'pending'::public.trade_status_enum",
          comment:
            "Lifecycle status reported by the bridge (pending, executing, filled, etc.).",
        },
        {
          name: "symbol",
          type: "text",
          nullable: false,
          comment: "Symbol traded by the execution stack.",
        },
        {
          name: "direction",
          type: "text",
          nullable: false,
          check: "direction in ('long','short','flat')",
          comment: "Direction executed on MT5.",
        },
        {
          name: "order_type",
          type: "text",
          nullable: false,
          default: "'market'::text",
          check: "order_type in ('market','limit','stop','stop_limit')",
          comment: "Order type captured for the trade record.",
        },
        {
          name: "volume",
          type: "numeric(14,2)",
          comment: "Trade volume lots captured from MT5.",
        },
        {
          name: "requested_price",
          type: "numeric(18,8)",
          comment: "Requested execution price.",
        },
        {
          name: "filled_price",
          type: "numeric(18,8)",
          comment: "Actual fill price returned by MT5.",
        },
        {
          name: "stop_loss",
          type: "numeric(18,8)",
          comment: "Stop loss price applied to the trade.",
        },
        {
          name: "take_profit",
          type: "numeric(18,8)",
          comment: "Take profit price applied to the trade.",
        },
        {
          name: "execution_payload",
          type: "jsonb",
          nullable: false,
          default: "'{}'::jsonb",
          comment: "Raw execution payload mirrored from MT5.",
        },
        {
          name: "error_reason",
          type: "text",
          comment: "Latest error reason captured for the trade.",
        },
        {
          name: "opened_at",
          type: "timestamptz",
          nullable: false,
          default: "now()",
          comment: "Timestamp when the trade record was created/opened.",
        },
        {
          name: "filled_at",
          type: "timestamptz",
          comment: "Timestamp when the trade filled.",
        },
        {
          name: "closed_at",
          type: "timestamptz",
          comment: "Timestamp when the trade fully closed.",
        },
        {
          name: "created_at",
          type: "timestamptz",
          nullable: false,
          default: "now()",
          comment: "Creation timestamp for the trade row.",
        },
        {
          name: "updated_at",
          type: "timestamptz",
          nullable: false,
          default: "now()",
          comment: "Last update timestamp for the trade row.",
        },
      ],
      primaryKey: {
        columns: ["id"],
      },
      indexes: [
        {
          name: "idx_trades_status_opened",
          expression: "(status, opened_at)",
        },
        {
          name: "idx_trades_signal",
          expression: "(signal_id)",
        },
        {
          name: "idx_trades_open_accounts",
          expression: "(account_id, status)",
          predicate: "status in ('pending','executing','partial_fill')",
        },
      ],
      rowLevelSecurity: {
        enable: true,
      },
      postDeploymentSql: [
        "ALTER TABLE public.trades REPLICA IDENTITY FULL;",
        "DROP TRIGGER IF EXISTS trg_trades_updated_at ON public.trades;",
        "CREATE TRIGGER trg_trades_updated_at\nBEFORE UPDATE ON public.trades\nFOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();",
      ],
    },
    {
      schema: "public",
      name: "hedge_actions",
      comment:
        "Hedge lifecycle ledger synchronised with automated defense systems.",
      columns: [
        {
          name: "id",
          type: "uuid",
          nullable: false,
          default: "gen_random_uuid()",
          comment: "Primary identifier for the hedge action.",
        },
        {
          name: "symbol",
          type: "text",
          nullable: false,
          comment: "Primary trading symbol hedged by the action.",
        },
        {
          name: "hedge_symbol",
          type: "text",
          nullable: false,
          comment: "Instrument used to hedge the core position.",
        },
        {
          name: "side",
          type: "public.hedge_action_side_enum",
          nullable: false,
          comment:
            "Whether the hedge is long or short relative to the core book.",
        },
        {
          name: "qty",
          type: "numeric(18,6)",
          nullable: false,
          comment: "Hedge quantity sized in instrument native units.",
        },
        {
          name: "reason",
          type: "public.hedge_action_reason_enum",
          nullable: false,
          comment:
            "Trigger that initiated the hedge (ATR spike, news, drawdown limit).",
        },
        {
          name: "status",
          type: "public.hedge_action_status_enum",
          nullable: false,
          default: "'OPEN'::public.hedge_action_status_enum",
          comment: "Lifecycle status for the hedge action.",
        },
        {
          name: "entry_price",
          type: "numeric(18,8)",
          comment: "Entry price recorded when the hedge opened.",
        },
        {
          name: "close_price",
          type: "numeric(18,8)",
          comment: "Exit price recorded when the hedge closed.",
        },
        {
          name: "pnl",
          type: "numeric(18,8)",
          comment: "Realised P&L captured for the hedge action.",
        },
        {
          name: "metadata",
          type: "jsonb",
          nullable: false,
          default: "'{}'::jsonb",
          comment: "Structured annotations from Dynamic Hedge models.",
        },
        {
          name: "created_at",
          type: "timestamptz",
          nullable: false,
          default: "now()",
          comment: "Timestamp when the hedge was opened.",
        },
        {
          name: "closed_at",
          type: "timestamptz",
          comment: "Timestamp when the hedge was closed (if applicable).",
        },
      ],
      primaryKey: {
        columns: ["id"],
      },
      indexes: [
        {
          name: "hedge_actions_status_idx",
          expression: "(status, created_at DESC)",
        },
        {
          name: "hedge_actions_symbol_idx",
          expression: "(symbol, created_at DESC)",
        },
      ],
      rowLevelSecurity: {
        enable: true,
      },
      policies: [
        {
          name: "hedge_actions_service_role_full_access",
          command: "ALL",
          roles: ["service_role"],
          using: "auth.role() = 'service_role'",
          withCheck: "auth.role() = 'service_role'",
          comment: "Allow the service role to manage hedge lifecycle records.",
        },
        {
          name: "hedge_actions_authenticated_select",
          command: "SELECT",
          roles: ["authenticated"],
          using: "true",
          comment: "Expose hedge ledger snapshots to authenticated dashboards.",
        },
      ],
    },
    {
      schema: "public",
      name: "mt5_trade_logs",
      comment:
        "Raw MT5 trade heartbeats mirrored from external terminals for audits.",
      columns: [
        {
          name: "id",
          type: "uuid",
          nullable: false,
          default: "gen_random_uuid()",
          comment: "Primary identifier for the MT5 trade log entry.",
        },
        {
          name: "mt5_ticket_id",
          type: "bigint",
          nullable: false,
          comment: "MT5 ticket identifier mirrored from the external terminal.",
        },
        {
          name: "symbol",
          type: "text",
          nullable: false,
          comment: "Symbol referenced by the MT5 ticket.",
        },
        {
          name: "side",
          type: "text",
          nullable: false,
          check: "side in ('buy','sell')",
          comment: "Direction reported by MT5 for the trade log entry.",
        },
        {
          name: "volume",
          type: "numeric(14,2)",
          comment: "Lot size associated with the ticket.",
        },
        {
          name: "open_price",
          type: "numeric(18,8)",
          comment: "Price at which MT5 opened the position.",
        },
        {
          name: "profit",
          type: "numeric(18,2)",
          comment: "Realised profit reported in the heartbeat payload.",
        },
        {
          name: "account_login",
          type: "text",
          comment: "MT5 account login string when available.",
        },
        {
          name: "opened_at",
          type: "timestamptz",
          comment: "Timestamp when MT5 reported the trade open.",
        },
        {
          name: "raw_payload",
          type: "jsonb",
          nullable: false,
          default: "'{}'::jsonb",
          comment: "Complete MT5 payload captured for debugging.",
        },
        {
          name: "received_at",
          type: "timestamptz",
          nullable: false,
          default: "now()",
          comment: "Timestamp when the heartbeat was ingested by Supabase.",
        },
        {
          name: "updated_at",
          type: "timestamptz",
          nullable: false,
          default: "now()",
          comment: "Timestamp when the heartbeat row last changed.",
        },
      ],
      primaryKey: {
        columns: ["id"],
      },
      indexes: [
        {
          name: "mt5_trade_logs_mt5_ticket_id_key",
          expression: "(mt5_ticket_id)",
          unique: true,
        },
        {
          name: "idx_mt5_trade_logs_symbol_time",
          expression: "(symbol, received_at DESC)",
        },
      ],
      rowLevelSecurity: {
        enable: true,
      },
      policies: [
        {
          name: "mt5_trade_logs_service_read",
          command: "SELECT",
          using: "auth.role() = 'service_role'",
          comment: "Allow bridge services to read mirrored MT5 trade logs.",
        },
        {
          name: "mt5_trade_logs_service_write",
          command: "ALL",
          using: "auth.role() = 'service_role'",
          withCheck: "auth.role() = 'service_role'",
          comment: "Allow bridge services to insert and update MT5 trade logs.",
        },
      ],
      postDeploymentSql: [
        "ALTER TABLE public.mt5_trade_logs REPLICA IDENTITY FULL;",
        "DROP TRIGGER IF EXISTS trg_mt5_trade_logs_updated ON public.mt5_trade_logs;",
        "CREATE TRIGGER trg_mt5_trade_logs_updated\nBEFORE UPDATE ON public.mt5_trade_logs\nFOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();",
      ],
    },
    {
      name: "claim_trading_signal",
      statement: `CREATE OR REPLACE FUNCTION public.claim_trading_signal(
  p_worker_id text,
  p_account_code text DEFAULT NULL
)
RETURNS public.signals
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_signal public.signals;
  v_account_id uuid;
  v_retry integer := 0;
BEGIN
  IF coalesce(trim(p_worker_id), '') = '' THEN
    RAISE EXCEPTION 'worker_id is required';
  END IF;

  IF p_account_code IS NOT NULL THEN
    SELECT id INTO v_account_id
    FROM public.trading_accounts
    WHERE account_code = p_account_code
    LIMIT 1;
  END IF;

  WITH candidate AS (
    SELECT s.id
    FROM public.signals s
    WHERE s.status = 'pending'
      AND (v_account_id IS NULL OR s.account_id = v_account_id)
    ORDER BY s.priority DESC, s.next_poll_at, s.created_at
    FOR UPDATE SKIP LOCKED
    LIMIT 1
  )
  UPDATE public.signals s
  SET status = 'claimed',
      acknowledged_at = now(),
      last_heartbeat_at = now(),
      updated_at = now()
  FROM candidate c
  WHERE s.id = c.id
  RETURNING s.* INTO v_signal;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT coalesce(max(retry_count) + 1, 0) INTO v_retry
  FROM public.signal_dispatches
  WHERE signal_id = v_signal.id;

  INSERT INTO public.signal_dispatches (
    signal_id,
    worker_id,
    status,
    retry_count,
    metadata,
    claimed_at,
    last_heartbeat_at,
    created_at,
    updated_at
  )
  VALUES (
    v_signal.id,
    p_worker_id,
    'claimed',
    v_retry,
    '{}'::jsonb,
    now(),
    now(),
    now(),
    now()
  );

  RETURN v_signal;
END;
$$;`,
    },
    {
      name: "mark_trading_signal_status",
      statement: `CREATE OR REPLACE FUNCTION public.mark_trading_signal_status(
  p_signal_id uuid,
  p_status public.signal_status_enum,
  p_error text DEFAULT NULL,
  p_next_poll_at timestamptz DEFAULT NULL,
  p_worker_id text DEFAULT NULL,
  p_dispatch_status public.signal_dispatch_status_enum DEFAULT NULL
)
RETURNS public.signals
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_signal public.signals;
  v_now timestamptz := now();
  v_dispatch_id uuid;
BEGIN
  UPDATE public.signals
  SET status = p_status,
      error_reason = p_error,
      next_poll_at = COALESCE(p_next_poll_at, next_poll_at),
      last_heartbeat_at = CASE WHEN p_worker_id IS NOT NULL THEN v_now ELSE last_heartbeat_at END,
      executed_at = CASE WHEN p_status = 'executed' THEN COALESCE(executed_at, v_now) ELSE executed_at END,
      cancelled_at = CASE WHEN p_status = 'cancelled' THEN COALESCE(cancelled_at, v_now) ELSE cancelled_at END,
      updated_at = v_now
  WHERE id = p_signal_id
  RETURNING * INTO v_signal;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'signal % not found', p_signal_id;
  END IF;

  IF p_worker_id IS NOT NULL THEN
    SELECT id INTO v_dispatch_id
    FROM public.signal_dispatches
    WHERE signal_id = p_signal_id
      AND worker_id = p_worker_id
    ORDER BY claimed_at DESC
    LIMIT 1;

    IF FOUND THEN
      UPDATE public.signal_dispatches
      SET status = COALESCE(p_dispatch_status, status),
          last_heartbeat_at = v_now,
          completed_at = CASE
            WHEN COALESCE(p_dispatch_status, status) = 'completed'
              THEN COALESCE(completed_at, v_now)
            ELSE completed_at
          END,
          failed_at = CASE
            WHEN COALESCE(p_dispatch_status, status) = 'failed'
              THEN COALESCE(failed_at, v_now)
            ELSE failed_at
          END,
          updated_at = v_now
      WHERE id = v_dispatch_id;
    END IF;
  END IF;

  RETURN v_signal;
END;
$$;`,
    },
    {
      name: "record_trade_update",
      statement: `CREATE OR REPLACE FUNCTION public.record_trade_update(
  p_signal_id uuid,
  p_mt5_ticket_id bigint,
  p_status public.trade_status_enum,
  p_payload jsonb DEFAULT '{}'::jsonb
)
RETURNS public.trades
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_signal public.signals;
  v_trade public.trades;
  v_now timestamptz := now();
BEGIN
  SELECT * INTO v_signal
  FROM public.signals
  WHERE id = p_signal_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'signal % not found', p_signal_id;
  END IF;

  INSERT INTO public.trades (
    signal_id,
    account_id,
    mt5_ticket_id,
    status,
    symbol,
    direction,
    order_type,
    volume,
    requested_price,
    filled_price,
    stop_loss,
    take_profit,
    execution_payload,
    error_reason,
    opened_at,
    filled_at,
    closed_at,
    created_at,
    updated_at
  )
  VALUES (
    v_signal.id,
    v_signal.account_id,
    p_mt5_ticket_id,
    p_status,
    v_signal.symbol,
    v_signal.direction,
    v_signal.order_type,
    NULLIF(p_payload ->> 'volume', '')::numeric,
    NULLIF(p_payload ->> 'requested_price', '')::numeric,
    NULLIF(p_payload ->> 'filled_price', '')::numeric,
    NULLIF(p_payload ->> 'stop_loss', '')::numeric,
    NULLIF(p_payload ->> 'take_profit', '')::numeric,
    COALESCE(p_payload, '{}'::jsonb),
    p_payload ->> 'error_reason',
    COALESCE(NULLIF(p_payload ->> 'opened_at', '')::timestamptz, v_now),
    NULLIF(p_payload ->> 'filled_at', '')::timestamptz,
    NULLIF(p_payload ->> 'closed_at', '')::timestamptz,
    v_now,
    v_now
  )
  ON CONFLICT (mt5_ticket_id) DO UPDATE
    SET status = EXCLUDED.status,
        execution_payload = COALESCE(p_payload, '{}'::jsonb),
        volume = EXCLUDED.volume,
        requested_price = EXCLUDED.requested_price,
        filled_price = EXCLUDED.filled_price,
        stop_loss = EXCLUDED.stop_loss,
        take_profit = EXCLUDED.take_profit,
        error_reason = EXCLUDED.error_reason,
        filled_at = COALESCE(EXCLUDED.filled_at, trades.filled_at),
        closed_at = COALESCE(EXCLUDED.closed_at, trades.closed_at),
        updated_at = v_now
  RETURNING * INTO v_trade;

  RETURN v_trade;
END;
$$;`,
    },
  ],
  sql: [
    {
      name: "claim_cold_email_leads",
      statement:
        "CREATE OR REPLACE FUNCTION public.claim_cold_email_leads(batch_size integer DEFAULT 5)\nRETURNS TABLE (\n  id uuid,\n  name text,\n  email text,\n  company text,\n  status text,\n  last_contacted timestamptz,\n  metadata jsonb\n)\nLANGUAGE plpgsql\nAS $$\nDECLARE\n  v_limit integer := GREATEST(LEAST(COALESCE(batch_size, 5), 50), 1);\nBEGIN\n  RETURN QUERY\n  WITH picked AS (\n    SELECT l.*\n    FROM public.cold_email_leads l\n    WHERE l.status = 'new'\n    ORDER BY l.last_contacted NULLS FIRST, l.created_at ASC\n    LIMIT v_limit\n    FOR UPDATE SKIP LOCKED\n  )\n  UPDATE public.cold_email_leads AS src\n  SET status = 'processing',\n      updated_at = now()\n  FROM picked\n  WHERE src.id = picked.id\n  RETURNING picked.id,\n    picked.name,\n    picked.email,\n    picked.company,\n    'processing'::text,\n    picked.last_contacted,\n    picked.metadata;\nEND;\n$$;",
    },
    {
      name: "reconciliation_dashboard",
      statement:
        "CREATE MATERIALIZED VIEW IF NOT EXISTS public.reconciliation_dashboard AS\nSELECT\n  o.id AS order_id,\n  o.status,\n  o.amount_fiat,\n  o.target_dct,\n  o.reference_code,\n  o.updated_at,\n  be.transaction_date,\n  be.amount_fiat AS bank_amount,\n  be.currency,\n  tt.amount_dct,\n  tt.tx_hash,\n  GREATEST(o.updated_at, COALESCE(tt.settled_at, o.updated_at)) AS last_touch\nFROM public.orders o\nLEFT JOIN public.bank_events_normalized be ON be.reference_code = o.reference_code\nLEFT JOIN public.treasury_transfers tt ON tt.order_id = o.id;",
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
