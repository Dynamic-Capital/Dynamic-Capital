export function extractTelegramUserId(initData: string): string {
  try {
    const params = new URLSearchParams(initData);
    const userStr = params.get("user");
    if (userStr) {
      const user = JSON.parse(userStr);
      return user.id?.toString() ?? "";
    }
  } catch (err) {
    console.warn("Failed to parse telegram user ID:", err);
  }
  return "";
}
