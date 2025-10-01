/**
 * Hook wrapping miniapp API endpoints.
 *
 * Each request checks the `Response.ok` flag before attempting to parse the
 * response body. If a request fails, the parsed error JSON (or a fallback
 * object with a `message` field) is thrown. Callers should handle these errors
 * with a `try/catch` block.
 */
import { extractTelegramUserId } from "../../../shared/telegram.ts";

export function useApi() {
  const getInitData = () =>
    (globalThis as unknown as { Telegram?: { WebApp?: { initData?: string } } })
      .Telegram?.WebApp?.initData || "";

  const handleError = async (res: Response) => {
    let error: unknown;
    try {
      error = await res.json();
    } catch {
      error = { message: res.statusText };
    }
    throw error;
  };

  const createIntent = async (payload: Record<string, unknown>) => {
    const res = await fetch("/api/intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ initData: getInitData(), ...payload }),
    });
    if (!res.ok) return handleError(res);
    return res.json();
  };

  const uploadReceipt = async (file: File) => {
    const form = new FormData();
    form.append("image", file);
    form.append("initData", getInitData());
    const res = await fetch("/api/receipt", {
      method: "POST",
      body: form,
    });
    if (!res.ok) return handleError(res);
    return res.json();
  };

  const submitTxid = async (payload: { txid: string }) => {
    const res = await fetch("/api/crypto-txid", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ initData: getInitData(), ...payload }),
    });
    if (!res.ok) return handleError(res);
    return res.json();
  };

  const getReceipts = async (limit: number) => {
    const initData = encodeURIComponent(getInitData());
    const res = await fetch(
      `/api/receipts?limit=${limit}&initData=${initData}`,
    );
    if (!res.ok) return handleError(res);
    return res.json();
  };

  const getPending = async () => {
    const initData = encodeURIComponent(getInitData());
    const res = await fetch(
      `/api/receipts?status=manual_review&initData=${initData}`,
    );
    if (!res.ok) return handleError(res);
    return res.json();
  };

  const get = async (path: string) => {
    const initData = encodeURIComponent(getInitData());
    const sep = path.includes("?") ? "&" : "?";
    const res = await fetch(`${path}${sep}initData=${initData}`);
    if (!res.ok) return handleError(res);
    return res.json();
  };

  const approve = async (id: string) => {
    const res = await fetch(`/api/receipt/${id}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ initData: getInitData() }),
    });
    if (!res.ok) return handleError(res);
  };

  const reject = async (id: string) => {
    const res = await fetch(`/api/receipt/${id}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ initData: getInitData() }),
    });
    if (!res.ok) return handleError(res);
  };

  const checkAdminStatus = async () => {
    const initData = getInitData();
    // Extract telegram user ID from initData (basic parsing)
    const telegram_user_id = extractTelegramUserId(initData);

    const res = await fetch("/api/admin-check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ telegram_user_id }),
    });
    if (!res.ok) return handleError(res);
    return res.json();
  };

  const getSubscriptionStatus = async () => {
    const initData = getInitData();
    const telegram_user_id = extractTelegramUserId(initData);

    const res = await fetch("/api/subscription-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ telegram_user_id }),
    });
    if (!res.ok) return handleError(res);
    return res.json();
  };

  const getVipDashboard = async () => {
    const initData = getInitData();
    const telegram_user_id = extractTelegramUserId(initData);

    const res = await fetch(
      `/api/vip-dashboard?telegram_user_id=${telegram_user_id}`,
    );
    if (!res.ok) return handleError(res);
    return res.json();
  };

  const syncUser = async () => {
    const res = await fetch("/api/sync-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ initData: getInitData() }),
    });
    if (!res.ok) return handleError(res);
    return res.json();
  };

  // Helper function to extract telegram user ID from initData
  // extractTelegramUserId imported from shared utility

  return {
    createIntent,
    uploadReceipt,
    submitTxid,
    getReceipts,
    getPending,
    get,
    approve,
    reject,
    checkAdminStatus,
    getSubscriptionStatus,
    getVipDashboard,
    syncUser,
  };
}
