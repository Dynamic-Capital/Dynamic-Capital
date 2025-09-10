export function createClient() {
  return {
    storage: {
      from(_bucket: string) {
        return {
          createSignedUploadUrl: async (key: string) => ({
            data: {
              signedUrl: `http://example.com/storage/v1/object/upload/sign/${key}?token=token`
            },
            error: null,
          }),
        };
      },
    },
    from(_table: string) {
      return {
        update(_vals: unknown) {
          return {
            eq(_field: string, _val: unknown) {
              return Promise.resolve({ error: null });
            },
          };
        },
        insert(vals: any) {
          const base = Promise.resolve({ data: null, error: null });
          return {
            select(_cols?: string) {
              const selectResp = Promise.resolve({ data: [vals], error: null });
              return {
                single() {
                  return Promise.resolve({ data: vals, error: null });
                },
                then: selectResp.then.bind(selectResp),
                catch: selectResp.catch.bind(selectResp),
                finally: selectResp.finally.bind(selectResp),
              };
            },
            then: base.then.bind(base),
            catch: base.catch.bind(base),
            finally: base.finally.bind(base),
          };
        },
      };
    },
  } as any;
}
export type SupabaseClient = ReturnType<typeof createClient>;
