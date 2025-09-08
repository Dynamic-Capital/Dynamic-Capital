import { supabase } from "../supabase/client.ts";

/**
 * Fetch a user record from Auth0 via the auth0_wrapper foreign table.
 */
export async function getAuth0User(userId: string) {
  const { data, error } = await (supabase as any)
    .from("auth0_users")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Retrieve a cached session payload from Redis using redis_wrapper.
 */
export async function getRedisSession(sessionId: string) {
  const { data, error } = await (supabase as any)
    .from("redis_sessions")
    .select("payload")
    .eq("session_id", sessionId)
    .single();

  if (error) throw error;
  return data?.payload ?? null;
}

/**
 * List files stored in S3 through the s3_wrapper foreign table.
 */
export async function listS3Files(prefix = "") {
  const { data, error } = await (supabase as any)
    .from("s3_files")
    .select("*")
    .like("filename", `${prefix}%`);

  if (error) throw error;
  return data ?? [];
}
