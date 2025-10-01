export const ORDER_ACTION_BUY = "BUY";
export const ORDER_ACTION_SELL = "SELL";
export const SUCCESS_RETCODE = 10009;

export type HedgeSide = string;

export interface TradeSignalLike {
  action?: unknown;
  [key: string]: unknown;
}

export interface TradeConnector {
  buy?(symbol: string, lot: number): MaybePromise<ConnectorExecution>;
  sell?(symbol: string, lot: number): MaybePromise<ConnectorExecution>;
  openHedge?(
    symbol: string,
    lot: number,
    side: HedgeSide,
  ): MaybePromise<ConnectorExecution>;
  closeHedge?(
    symbol: string,
    lot: number,
    side: HedgeSide,
  ): MaybePromise<ConnectorExecution>;
}

export interface TradeRequest {
  symbol: string;
  lot: number;
}

export interface HedgeRequest extends TradeRequest {
  side: HedgeSide;
  close?: boolean;
}

export interface ConnectorExecution {
  retcode?: number;
  profit?: number;
  ticket?: number;
  order?: number;
  price?: number;
  comment?: string;
  message?: string;
  symbol?: string;
  lot?: number;
  [key: string]: unknown;
}

export interface TradeExecutionInit {
  retcode: number;
  message: string;
  profit: number;
  ticket?: number;
  symbol?: string;
  lot?: number;
  price?: number;
  rawResponse?: unknown;
}

export type MaybePromise<T> = T | Promise<T>;

type OrderAction = typeof ORDER_ACTION_BUY | typeof ORDER_ACTION_SELL | string;

export class TradeExecutionResult {
  retcode: number;
  message: string;
  profit: number;
  ticket?: number;
  symbol?: string;
  lot?: number;
  price?: number;
  rawResponse?: unknown;

  constructor(init: TradeExecutionInit) {
    this.retcode = init.retcode;
    this.message = init.message;
    this.profit = init.profit;
    this.ticket = init.ticket;
    this.symbol = init.symbol;
    this.lot = init.lot;
    this.price = init.price;
    this.rawResponse = init.rawResponse;
  }

  get ok(): boolean {
    return this.retcode === SUCCESS_RETCODE;
  }

  toJSON(): TradeExecutionInit {
    return {
      retcode: this.retcode,
      message: this.message,
      profit: this.profit,
      ticket: this.ticket,
      symbol: this.symbol,
      lot: this.lot,
      price: this.price,
      rawResponse: this.rawResponse,
    };
  }
}

class PaperBroker {
  async execute(
    action: OrderAction,
    symbol: string,
    lot: number,
  ): Promise<TradeExecutionResult> {
    const drift = randomBetween(-1, 1);
    const baseProfit = lot * 100;
    const multiplier = action === ORDER_ACTION_BUY
      ? 1
      : action === ORDER_ACTION_SELL
      ? 0.6
      : 0.8;
    const profit = round2(baseProfit * multiplier + drift);

    return new TradeExecutionResult({
      retcode: SUCCESS_RETCODE,
      message: `Simulated ${action} order executed`,
      profit,
      ticket: randomInt(10_000, 99_999),
      symbol,
      lot,
      rawResponse: { simulated: true },
    });
  }

  async openHedge(
    symbol: string,
    lot: number,
    side: HedgeSide,
  ): Promise<TradeExecutionResult> {
    return this.execute(determineHedgeAction(side, false), symbol, lot);
  }

  async closeHedge(
    symbol: string,
    lot: number,
    side: HedgeSide,
  ): Promise<TradeExecutionResult> {
    return this.execute(determineHedgeAction(side, true), symbol, lot);
  }
}

export class DynamicNodeAlgo {
  private readonly connector: TradeConnector;
  private paperBroker: PaperBroker | null = null;

  constructor(connector?: TradeConnector) {
    this.connector = connector ?? new PaperBroker();
  }

  async executeTrade(
    signal: unknown,
    request: TradeRequest,
  ): Promise<TradeExecutionResult> {
    const action = this.extractAction(signal);

    if (action === ORDER_ACTION_BUY) {
      return this.buy(request);
    }

    if (action === ORDER_ACTION_SELL) {
      return this.sell(request);
    }

    return new TradeExecutionResult({
      retcode: 0,
      message: "No trade executed for neutral signal",
      profit: 0,
      symbol: request.symbol,
      lot: request.lot,
    });
  }

  async executeHedge(request: HedgeRequest): Promise<TradeExecutionResult> {
    const { symbol, lot, side, close = false } = request;

    return close
      ? this.closeHedge(symbol, lot, side)
      : this.openHedge(symbol, lot, side);
  }

  private async buy(request: TradeRequest): Promise<TradeExecutionResult> {
    const { symbol, lot } = request;

    if (this.connector.buy) {
      try {
        const response = await this.connector.buy(symbol, lot);
        return this.normaliseResponse(response, symbol, lot, ORDER_ACTION_BUY);
      } catch (error) {
        return this.paperExecute(ORDER_ACTION_BUY, symbol, lot, error);
      }
    }

    return this.paperExecute(ORDER_ACTION_BUY, symbol, lot);
  }

  private async sell(request: TradeRequest): Promise<TradeExecutionResult> {
    const { symbol, lot } = request;

    if (this.connector.sell) {
      try {
        const response = await this.connector.sell(symbol, lot);
        return this.normaliseResponse(response, symbol, lot, ORDER_ACTION_SELL);
      } catch (error) {
        return this.paperExecute(ORDER_ACTION_SELL, symbol, lot, error);
      }
    }

    return this.paperExecute(ORDER_ACTION_SELL, symbol, lot);
  }

  private async openHedge(
    symbol: string,
    lot: number,
    side: HedgeSide,
  ): Promise<TradeExecutionResult> {
    const action = determineHedgeAction(side, false);

    if (this.connector.openHedge) {
      try {
        const response = await this.connector.openHedge(symbol, lot, side);
        return this.normaliseResponse(response, symbol, lot, action);
      } catch (error) {
        return this.paperExecute(action, symbol, lot, error);
      }
    }

    return this.paperExecute(action, symbol, lot);
  }

  private async closeHedge(
    symbol: string,
    lot: number,
    side: HedgeSide,
  ): Promise<TradeExecutionResult> {
    const action = determineHedgeAction(side, true);

    if (this.connector.closeHedge) {
      try {
        const response = await this.connector.closeHedge(symbol, lot, side);
        return this.normaliseResponse(response, symbol, lot, action);
      } catch (error) {
        return this.paperExecute(action, symbol, lot, error);
      }
    }

    return this.paperExecute(action, symbol, lot);
  }

  private async paperExecute(
    action: OrderAction,
    symbol: string,
    lot: number,
    error?: unknown,
  ): Promise<TradeExecutionResult> {
    const broker = this.getPaperBroker();
    const result = await broker.execute(action, symbol, lot);

    if (error) {
      result.rawResponse = {
        fallback: "paper",
        error: errorToString(error),
      };
    }

    return result;
  }

  private getPaperBroker(): PaperBroker {
    if (!this.paperBroker) {
      this.paperBroker = new PaperBroker();
    }

    return this.paperBroker;
  }

  private extractAction(signal: unknown): OrderAction {
    if (!signal) {
      return "NEUTRAL";
    }

    if (typeof signal === "string") {
      return signal.trim().toUpperCase();
    }

    if (typeof signal === "object") {
      const maybeAction = (signal as TradeSignalLike).action;
      if (maybeAction !== undefined && maybeAction !== null) {
        return String(maybeAction).trim().toUpperCase();
      }
    }

    return String(signal).trim().toUpperCase();
  }

  private normaliseResponse(
    response: ConnectorExecution | TradeExecutionResult | null | undefined,
    symbol: string,
    lot: number,
    action: OrderAction,
  ): TradeExecutionResult {
    if (response instanceof TradeExecutionResult) {
      if (!response.symbol) {
        response.symbol = symbol;
      }
      if (response.lot === undefined) {
        response.lot = lot;
      }
      return response;
    }

    if (!response) {
      return new TradeExecutionResult({
        retcode: 0,
        message: "Trade connector returned no response.",
        profit: 0,
        symbol,
        lot,
        rawResponse: response ?? null,
      });
    }

    const retcode = typeof response.retcode === "number" ? response.retcode : 0;
    const profit = typeof response.profit === "number" ? response.profit : 0;
    const ticket = firstNumber(response.ticket, response.order);
    const price = typeof response.price === "number"
      ? response.price
      : undefined;
    const message = pickMessage(response, action);
    const payload = new TradeExecutionResult({
      retcode,
      message,
      profit,
      ticket,
      price,
      symbol: typeof response.symbol === "string" ? response.symbol : symbol,
      lot: typeof response.lot === "number" ? response.lot : lot,
      rawResponse: response,
    });

    return payload;
  }
}

function determineHedgeAction(side: HedgeSide, closing: boolean): OrderAction {
  const normalised = String(side ?? "").trim().toUpperCase();

  if (closing) {
    return normalised === "LONG_HEDGE" ? ORDER_ACTION_SELL : ORDER_ACTION_BUY;
  }

  return normalised === "LONG_HEDGE" ? ORDER_ACTION_BUY : ORDER_ACTION_SELL;
}

function firstNumber(...values: Array<number | undefined>): number | undefined {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
  }
  return undefined;
}

function pickMessage(
  response: ConnectorExecution,
  action: OrderAction,
): string {
  const comment = typeof response.comment === "string"
    ? response.comment.trim()
    : "";
  if (comment) {
    return comment;
  }

  const message = typeof response.message === "string"
    ? response.message.trim()
    : "";
  if (message) {
    return message;
  }

  return `Trade executed (${action})`;
}

function randomBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function errorToString(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return JSON.stringify(error);
}
