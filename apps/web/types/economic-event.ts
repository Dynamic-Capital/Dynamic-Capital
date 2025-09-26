export type ImpactLevel = "High" | "Medium" | "Low";

export interface EconomicEventMarketQuote {
  instrumentId: string;
  displaySymbol: string;
  name: string;
  format: Intl.NumberFormatOptions;
  last?: number;
  changePercent?: number;
  high?: number;
  low?: number;
  lastUpdated?: string | null;
}

export interface EconomicEventMarketHighlight {
  focus: string;
  instruments: EconomicEventMarketQuote[];
}

export interface EconomicEvent {
  id: string;
  day: string;
  time: string;
  title: string;
  impact: ImpactLevel;
  marketFocus: string[];
  marketHighlights: EconomicEventMarketHighlight[];
  commentary: string;
  deskPlan: string[];
}
