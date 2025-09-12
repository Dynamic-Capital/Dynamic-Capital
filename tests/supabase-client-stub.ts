import { createClient as createBaseClient } from "../supabase/functions/telegram-bot/vendor/esm.sh/@supabase/supabase-js@2.53.0.js";

export function createClient() {
  const client = createBaseClient();
  const origFrom = (client as any).from.bind(client);
  (client as any).from = (table: string) => {
    const api = origFrom(table);
    const origInsert = api.insert?.bind(api);
    if (origInsert) {
      api.insert = (vals: any) => {
        origInsert(vals);
        const arr = Array.isArray(vals) ? vals : [vals];
        return {
          select: () => Promise.resolve({ data: arr, error: null }),
        } as any;
      };
    }
    return api;
  };
  (client as any).storage = {
    from(_bucket: string) {
      return {
        createSignedUploadUrl: async (key: string) => ({
          data: {
            signedUrl:
              `http://example.com/storage/v1/object/upload/sign/${key}?token=token`,
          },
          error: null,
        }),
      };
    },
  };
  (client as any).auth = {
    async getUser() {
      return { data: { user: { id: "", user_metadata: { telegram_id: "" } } }, error: null };
    },
    async signJWT(_payload: any, _opts: any) {
      return { access_token: "token" };
    },
  };
  return client as any;
}

export type SupabaseClient = ReturnType<typeof createClient>;
