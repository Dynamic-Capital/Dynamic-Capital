import {
  SUPABASE_FUNCTIONS_URL,
  SUPABASE_URL,
} from "@/config/supabase-runtime";

type ResolvedHint = {
  key: string;
  origin: string;
  crossOrigin: boolean;
};

function resolveOrigin(candidate?: string | null): ResolvedHint | null {
  if (!candidate) {
    return null;
  }

  try {
    const url = new URL(candidate);
    return {
      key: url.origin,
      origin: url.origin,
      crossOrigin: true,
    };
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "[ResourceHints] Unable to parse resource hint URL",
        candidate,
        error,
      );
    }
    return null;
  }
}

const THIRD_PARTY_URLS: Array<string | undefined> = [
  SUPABASE_URL,
  SUPABASE_FUNCTIONS_URL,
  process.env.NEXT_PUBLIC_POSTHOG_HOST,
  process.env.NEXT_PUBLIC_POSTHOG_PROXY_HOST,
  process.env.NEXT_PUBLIC_ANALYTICS_PROXY,
];

const resolvedHints = THIRD_PARTY_URLS
  .map((entry) => resolveOrigin(entry))
  .filter((entry): entry is ResolvedHint => entry !== null)
  .reduce<ResolvedHint[]>((acc, hint) => {
    if (!acc.some((existing) => existing.key === hint.key)) {
      acc.push(hint);
    }
    return acc;
  }, []);

export function ResourceHints() {
  if (resolvedHints.length === 0) {
    return null;
  }

  return (
    <>
      {resolvedHints.map((hint) => (
        <link
          key={`dns-prefetch:${hint.key}`}
          rel="dns-prefetch"
          href={hint.origin}
        />
      ))}
      {resolvedHints.map((hint) => (
        <link
          key={`preconnect:${hint.key}`}
          rel="preconnect"
          href={hint.origin}
          crossOrigin={hint.crossOrigin ? "anonymous" : undefined}
        />
      ))}
    </>
  );
}
