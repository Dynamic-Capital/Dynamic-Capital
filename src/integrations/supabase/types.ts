// Shared Supabase type definitions
//
// The Lovable mini-app (src/) and the Next.js app (apps/web/) both rely on the
// same Supabase project. The generated types already live in
// `apps/web/types/supabase.ts`; re-export them here so packages that resolve the
// `@/integrations/supabase` alias from the Vite workspace continue to benefit
// from the full schema without duplicating files or drifting out of sync.

export type {
  Database,
  Json,
  Tables,
  TablesInsert,
  TablesUpdate,
  Enums,
  CompositeTypes,
} from "../../../apps/web/types/supabase";

export { Constants } from "../../../apps/web/types/supabase";
