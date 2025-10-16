-- Ensure pg_graphql can build schema when pgsodium key types include hyphenated variants
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typnamespace = 'pgsodium'::regnamespace
      AND typname = 'key_type'
  ) THEN
    EXECUTE $$
      COMMENT ON TYPE pgsodium.key_type IS '@graphql({"mappings":{"aead-det":"AEAD_DET","aead-ietf":"AEAD_IETF"}})';
    $$;
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
