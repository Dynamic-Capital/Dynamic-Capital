export async function freshImport(path: string | URL) {
  const fileUrl = typeof path === "string"
    ? new URL(path, import.meta.url)
    : path;
  fileUrl.searchParams.append("t", Math.random().toString());
  return await import(/* @vite-ignore */ fileUrl.href);
}
