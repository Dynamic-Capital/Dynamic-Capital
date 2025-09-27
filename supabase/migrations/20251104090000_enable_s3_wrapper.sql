-- Enable wrappers and configure S3 access for the OneDrive knowledge bucket
create schema if not exists extensions;

create extension if not exists wrappers with schema extensions;
create extension if not exists s3_wrapper with schema extensions;

-- Create the foreign server using credentials stored in Postgres configuration.
-- Administrators must set the following GUCs prior to running this migration:
--   app.settings.one_drive_s3_endpoint
--   app.settings.one_drive_s3_region (defaults to us-east-1 if omitted)
--   app.settings.one_drive_s3_bucket
--   app.settings.one_drive_s3_prefix (optional)
--   app.settings.one_drive_s3_access_key_id
--   app.settings.one_drive_s3_secret_access_key
--   app.settings.one_drive_s3_manifest (defaults to metadata.jsonl)
-- Optionally set app.settings.one_drive_s3_session_token when temporary credentials are used.

DO $$
DECLARE
  v_endpoint text := current_setting('app.settings.one_drive_s3_endpoint', true);
  v_region text := coalesce(current_setting('app.settings.one_drive_s3_region', true), 'us-east-1');
  v_bucket text := current_setting('app.settings.one_drive_s3_bucket', true);
  v_prefix text := coalesce(current_setting('app.settings.one_drive_s3_prefix', true), '');
  v_access_key text := current_setting('app.settings.one_drive_s3_access_key_id', true);
  v_secret_key text := current_setting('app.settings.one_drive_s3_secret_access_key', true);
  v_session_token text := current_setting('app.settings.one_drive_s3_session_token', true);
  v_options text;
BEGIN
  IF v_endpoint IS NULL OR v_bucket IS NULL OR v_access_key IS NULL OR v_secret_key IS NULL THEN
    RAISE NOTICE 'Skipping creation of foreign server "onedrive_docs_s3"; configure app.settings.one_drive_s3_* GUCs and re-run.';
  ELSIF NOT EXISTS (SELECT 1 FROM pg_foreign_server WHERE srvname = 'onedrive_docs_s3') THEN
    v_options := format(
      'endpoint %L, region %L, bucket %L, prefix %L, use_ssl %L, access_key_id %L, secret_access_key %L',
      v_endpoint,
      v_region,
      v_bucket,
      v_prefix,
      'true',
      v_access_key,
      v_secret_key
    );
    IF v_session_token IS NOT NULL THEN
      v_options := v_options || format(', session_token %L', v_session_token);
    END IF;
    EXECUTE format(
      'CREATE SERVER onedrive_docs_s3 FOREIGN DATA WRAPPER s3_wrapper OPTIONS (%s);',
      v_options
    );
  END IF;
END;
$$;

-- Create a foreign table over the manifest that indexes OneDrive-backed assets.
DO $$
DECLARE
  v_manifest text := coalesce(current_setting('app.settings.one_drive_s3_manifest', true), 'metadata.jsonl');
BEGIN
  IF EXISTS (SELECT 1 FROM pg_foreign_server WHERE srvname = 'onedrive_docs_s3') THEN
    EXECUTE format(
      $$CREATE FOREIGN TABLE IF NOT EXISTS public.one_drive_assets (
        object_key      text,
        title           text,
        description     text,
        content_type    text,
        byte_size       text,
        last_modified   text,
        checksum        text,
        source_url      text,
        tags            text
      )
      SERVER onedrive_docs_s3
      OPTIONS (
        filename %L,
        format 'jsonl',
        compression 'auto'
      );$$,
      v_manifest
    );
  ELSE
    RAISE NOTICE 'Skipping creation of foreign table public.one_drive_assets; server onedrive_docs_s3 does not exist yet.';
  END IF;
END;
$$;

-- Grant access to runtime roles when the table exists.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_foreign_table ft
    JOIN pg_class c ON c.oid = ft.ftrelid
    WHERE c.relname = 'one_drive_assets'
      AND c.relnamespace = 'public'::regnamespace
  ) THEN
    EXECUTE 'GRANT USAGE ON FOREIGN SERVER onedrive_docs_s3 TO service_role';
    EXECUTE 'GRANT SELECT ON public.one_drive_assets TO service_role';
    EXECUTE 'GRANT SELECT ON public.one_drive_assets TO authenticated';
  END IF;
END;
$$;
