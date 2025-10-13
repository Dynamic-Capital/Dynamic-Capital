import type { User } from "@supabase/supabase-js";

interface ProfileMetadata {
  full_name?: string;
  first_name?: string;
  last_name?: string;
  preferred_name?: string;
}

const hasText = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

export function getAccountLabel(user: User | null): string | undefined {
  if (!user) {
    return undefined;
  }

  const metadata = (user.user_metadata ?? {}) as ProfileMetadata;

  if (hasText(metadata.preferred_name)) {
    return metadata.preferred_name.trim();
  }

  if (hasText(metadata.full_name)) {
    return metadata.full_name.trim();
  }

  if (hasText(metadata.first_name) && hasText(metadata.last_name)) {
    return `${metadata.first_name.trim()} ${metadata.last_name.trim()}`;
  }

  if (hasText(metadata.first_name)) {
    return metadata.first_name.trim();
  }

  if (hasText(metadata.last_name)) {
    return metadata.last_name.trim();
  }

  return hasText(user.email) ? user.email : undefined;
}
