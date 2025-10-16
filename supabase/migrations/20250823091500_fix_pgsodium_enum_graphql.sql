-- Ensure pg_graphql can build schema when pgsodium key types include hyphenated variants
DO $$
DECLARE
  existing_comment text;
  normalized_comment text;
  replaced_comment text;
  needs_update boolean := false;
  graphql_mapping constant text := '@graphql({"enumValues":{"aead-det":"AEAD_DET","aead-ietf":"AEAD_IETF"}})';
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typnamespace = 'pgsodium'::regnamespace
      AND typname = 'key_type'
  ) THEN
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

    replaced_comment := regexp_replace(
      normalized_comment,
      '@graphql\([^\n]*\)',
      graphql_mapping,
      'g'
    );

    IF replaced_comment <> normalized_comment THEN
      normalized_comment := replaced_comment;
      needs_update := true;
    END IF;

    IF position(graphql_mapping in normalized_comment) = 0 THEN
      normalized_comment := normalized_comment || E'\n' || graphql_mapping;
      needs_update := true;
    END IF;

    IF needs_update THEN
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
