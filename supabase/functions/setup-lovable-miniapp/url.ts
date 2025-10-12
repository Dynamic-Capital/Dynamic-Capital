export function normalizeMiniAppUrl(rawUrl: string): string {
  try {
    const url = new URL(rawUrl);
    if (url.protocol !== "https:") {
      throw new Error("MINI_APP_URL must start with https://");
    }
    const trimmedPath = url.pathname.replace(/\/+$/, "");
    url.pathname = `${trimmedPath}/`;
    url.hash = "";
    return url.toString();
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid MINI_APP_URL: ${reason}`);
  }
}
