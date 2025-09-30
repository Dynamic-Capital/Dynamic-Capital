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
  ],
  sql: [
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
