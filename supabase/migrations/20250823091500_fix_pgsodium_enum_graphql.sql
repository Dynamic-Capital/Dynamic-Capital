-- Ensure pg_graphql can build schema when pgsodium key types include hyphenated variants
DO $$
DECLARE
  existing_comment text;
  normalized_comment text;
  updated_comment text;
  needs_update boolean := false;
  mapping jsonb := '{}'::jsonb;
  mapping_text text;
  enum_value text;
  sanitized_name text;
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typnamespace = 'pgsodium'::regnamespace
      AND typname = 'key_type'
  ) THEN
    FOR enum_value IN
      SELECT e.enumlabel
      FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typnamespace = 'pgsodium'::regnamespace
        AND t.typname = 'key_type'
    LOOP
      IF enum_value ~ '[-]' THEN
        sanitized_name := upper(regexp_replace(enum_value, '[-]', '_', 'g'));
        mapping := mapping || jsonb_build_object(enum_value, sanitized_name);
      END IF;
    END LOOP;

    IF mapping <> '{}'::jsonb THEN
      mapping_text := '@graphql({"enumValues":' || regexp_replace(mapping::text, '\\s+', '', 'g') || '})';
    END IF;

    SELECT d.description
    INTO existing_comment
    FROM pg_type t
    LEFT JOIN pg_description d ON d.objoid = t.oid
    WHERE t.typnamespace = 'pgsodium'::regnamespace
      AND t.typname = 'key_type';

    normalized_comment := trim(coalesce(existing_comment, ''));

    IF normalized_comment = '' THEN
      normalized_comment := '@enum';
      needs_update := true;
    ELSIF position('@enum' in normalized_comment) = 0 THEN
      normalized_comment := normalized_comment || E'\n@enum';
      needs_update := true;
    END IF;

    IF mapping_text IS NOT NULL THEN
      IF position(mapping_text in normalized_comment) = 0 THEN
        updated_comment := regexp_replace(
          normalized_comment,
          E'(\\n)?@graphql\\([^\\n]*\\)',
          '',
          'g'
        );

        IF updated_comment <> normalized_comment THEN
          normalized_comment := trim(updated_comment);
          needs_update := true;
        END IF;

        IF normalized_comment = '' THEN
          normalized_comment := mapping_text;
        ELSE
          normalized_comment := normalized_comment || E'\n' || mapping_text;
        END IF;

        needs_update := true;
      END IF;
    END IF;

    IF needs_update THEN
      normalized_comment := trim(normalized_comment);
      normalized_comment := regexp_replace(normalized_comment, E'\n{3,}', E'\n\n', 'g');
      EXECUTE format('COMMENT ON TYPE pgsodium.key_type IS %L', normalized_comment);
    END IF;
  END IF;
END
$$;

-- Rebuild the GraphQL schema when pg_graphql is available so Studio sees the updated mappings immediately
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc
    WHERE pronamespace = 'graphql'::regnamespace
      AND proname = 'rebuild_schema'
      AND prokind = 'f'
  ) THEN
    PERFORM graphql.rebuild_schema();
  END IF;
END
$$;
