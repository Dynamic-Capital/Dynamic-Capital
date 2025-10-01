import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const upsertMock = vi.fn();
const fromMock = vi.fn();
const createClientMock = vi.fn();

vi.mock("@supabase/supabase-js", () => ({
  createClient: (...args: unknown[]) =>
    createClientMock(...(args as [string, string])),
}));

describe("tradingview alert handler", () => {
  beforeEach(() => {
    vi.resetModules();
    upsertMock.mockReset();
    fromMock.mockReset();
    createClientMock.mockReset();

    upsertMock.mockResolvedValue({ error: null });
    fromMock.mockReturnValue({
      upsert: upsertMock,
    });
    createClientMock.mockReturnValue({
      from: fromMock,
    });

    process.env.TRADINGVIEW_WEBHOOK_SECRET = "super-secret";
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
    process.env.SUPABASE_ALERTS_TABLE = "tradingview_alerts";
  });

  afterEach(() => {
    delete process.env.TRADINGVIEW_WEBHOOK_SECRET;
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.SUPABASE_ALERTS_TABLE;
  });

  it("persists a normalized TradingView alert when secret and payload are valid", async () => {
    const handlerModule = await import("../api/tradingview-alerts.js");
    const handler = handlerModule.default;

    const payload = {
      alert_uuid: "0d64c5b3-70d6-4d7c-8ecf-21f5c1e1f1c8",
      symbol: "BINANCE:btcusdt",
      timestamp: "2023-05-01T12:34:56Z",
      price: "67890.12",
      strategy: {
        order: {
          action: "buy",
          comment: "Breakout",
        },
      },
    };

    const req = createRequest(payload, "super-secret");
    const res = createResponse();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      status: "ok",
      alertUuid: payload.alert_uuid,
    });
    expect(fromMock).toHaveBeenCalledWith("tradingview_alerts");
    expect(upsertMock).toHaveBeenCalledTimes(1);
    const [record, options] = upsertMock.mock.calls[0];
    expect(record).toMatchObject({
      alert_uuid: payload.alert_uuid,
      symbol: "BTCUSDT",
      exchange: "BINANCE",
      price: 67890.12,
      action: "buy",
      comment: "Breakout",
    });
    expect(record.payload).toBeDefined();
    expect(record.ingested_at).toMatch(/T/);
    expect(options).toEqual({ onConflict: "alert_uuid" });
  });

  it("rejects the request when the shared secret does not match", async () => {
    const handlerModule = await import("../api/tradingview-alerts.js");
    const handler = handlerModule.default;

    const req = createRequest({
      alert_uuid: "abc",
      symbol: "BINANCE:ETHUSDT",
      timestamp: "2023-01-01T00:00:00Z",
    }, "invalid");
    const res = createResponse();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(upsertMock).not.toHaveBeenCalled();
  });

  it("returns a validation error when payload is malformed", async () => {
    const handlerModule = await import("../api/tradingview-alerts.js");
    const handler = handlerModule.default;

    const req = createRequest({
      alert_uuid: "abc-123",
      timestamp: "2023-01-01T00:00:00Z",
    }, "super-secret");
    const res = createResponse();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: "Alert payload must include a symbol.",
    });
    expect(upsertMock).not.toHaveBeenCalled();
  });
});

function createRequest(body: unknown, secret: string) {
  return {
    method: "POST",
    headers: {
      "x-tradingview-secret": secret,
    },
    body,
  } as any;
}

function createResponse() {
  const res: any = {
    status: vi.fn(),
    json: vi.fn(),
  };

  res.status.mockImplementation(() => res);

  return res;
}
