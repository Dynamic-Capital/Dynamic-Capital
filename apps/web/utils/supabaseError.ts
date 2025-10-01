export function formatSupabaseError(
  error: unknown,
  fallback = "An unexpected error occurred",
): string {
  if (error && typeof error === "object" && "message" in error) {
    console.error(error);
    return (error as { message: string }).message;
  }
  console.error(error);
  return fallback;
}
