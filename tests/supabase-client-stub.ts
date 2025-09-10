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
        insert(_vals: unknown) {
          return Promise.resolve({ data: null, error: null });
        },
      };
    },
  } as any;
}
export type SupabaseClient = ReturnType<typeof createClient>;
