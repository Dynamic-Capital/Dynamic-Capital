import { describe, expect, it, vi } from "vitest";
import {
  DynamicNodeAlgo,
  ORDER_ACTION_BUY,
  ORDER_ACTION_SELL,
  SUCCESS_RETCODE,
  TradeExecutionResult,
} from "../lib/dynamic-node-algo.js";

describe("DynamicNodeAlgo", () => {
  it("executes buy trades through a provided connector", async () => {
    const connector = {
      buy: vi.fn().mockResolvedValue({
        retcode: SUCCESS_RETCODE,
        profit: 120.5,
        comment: "Filled at market",
        ticket: 54321,
      }),
    };

    const algo = new DynamicNodeAlgo(connector);
    const result = await algo.executeTrade({ action: "buy" }, {
      symbol: "XAUUSD",
      lot: 0.3,
    });

    expect(connector.buy).toHaveBeenCalledWith("XAUUSD", 0.3);
    expect(result).toBeInstanceOf(TradeExecutionResult);
    expect(result.ok).toBe(true);
    expect(result.message).toBe("Filled at market");
    expect(result.symbol).toBe("XAUUSD");
    expect(result.lot).toBe(0.3);
    expect(result.ticket).toBe(54321);
  });

  it("falls back to the paper broker when connector fails", async () => {
    const connector = {
      sell: vi.fn().mockRejectedValue(new Error("Connector offline")),
    };

    const algo = new DynamicNodeAlgo(connector);
    const result = await algo.executeTrade({ action: ORDER_ACTION_SELL }, {
      symbol: "EURUSD",
      lot: 1,
    });

    expect(connector.sell).toHaveBeenCalledWith("EURUSD", 1);
    expect(result.ok).toBe(true);
    expect(result.message).toContain("Simulated SELL order executed");
    expect(result.rawResponse).toMatchObject({
      fallback: "paper",
      error: "Connector offline",
    });
  });

  it("returns a neutral result when action is not buy or sell", async () => {
    const algo = new DynamicNodeAlgo();
    const result = await algo.executeTrade("hold", {
      symbol: "GBPUSD",
      lot: 0.5,
    });

    expect(result.ok).toBe(false);
    expect(result.message).toBe("No trade executed for neutral signal");
    expect(result.symbol).toBe("GBPUSD");
    expect(result.lot).toBe(0.5);
  });

  it("supports hedge lifecycle operations", async () => {
    const openHedge = vi.fn().mockResolvedValue({
      retcode: SUCCESS_RETCODE,
      comment: "Hedge opened",
    });
    const closeHedge = vi.fn().mockResolvedValue(
      new TradeExecutionResult({
        retcode: SUCCESS_RETCODE,
        message: "Hedge closed",
        profit: 15,
        symbol: "BTCUSD",
        lot: 2,
      }),
    );

    const algo = new DynamicNodeAlgo({ openHedge, closeHedge });

    const openResult = await algo.executeHedge({
      symbol: "BTCUSD",
      lot: 2,
      side: "LONG_HEDGE",
    });
    expect(openHedge).toHaveBeenCalledWith("BTCUSD", 2, "LONG_HEDGE");
    expect(openResult.ok).toBe(true);
    expect(openResult.message).toBe("Hedge opened");

    const closeResult = await algo.executeHedge({
      symbol: "BTCUSD",
      lot: 2,
      side: "LONG_HEDGE",
      close: true,
    });
    expect(closeHedge).toHaveBeenCalledWith("BTCUSD", 2, "LONG_HEDGE");
    expect(closeResult.ok).toBe(true);
    expect(closeResult.message).toBe("Hedge closed");
  });
});
