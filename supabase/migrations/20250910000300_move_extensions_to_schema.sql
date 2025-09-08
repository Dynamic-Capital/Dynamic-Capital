-- Move existing extensions from public to extensions schema
CREATE SCHEMA IF NOT EXISTS extensions;
REVOKE ALL ON SCHEMA extensions FROM PUBLIC;
GRANT USAGE ON SCHEMA extensions TO postgres;

ALTER EXTENSION IF EXISTS pgcrypto SET SCHEMA extensions;
ALTER EXTENSION IF EXISTS vector SET SCHEMA extensions;
ALTER EXTENSION IF EXISTS hypopg SET SCHEMA extensions;
ALTER EXTENSION IF EXISTS index_advisor SET SCHEMA extensions;
