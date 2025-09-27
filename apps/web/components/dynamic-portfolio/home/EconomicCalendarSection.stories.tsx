import { EconomicCalendarSection } from "./EconomicCalendarSection";
import type { EconomicEvent } from "@/types/economic-event";

const MOCK_EVENTS: EconomicEvent[] = [
  {
    id: "fomc",
    day: "Tue · 19 Mar",
    time: "18:00 GMT",
    title: "FOMC rate decision & Powell press conference",
    impact: "High",
    marketFocus: ["USD", "Rates", "US Indices"],
    marketHighlights: [
      {
        focus: "USD",
        instruments: [
          {
            instrumentId: "DXY",
            displaySymbol: "DXY",
            name: "US Dollar Index",
            format: {
              style: "decimal",
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            },
            last: 104.21,
            changePercent: 0.32,
          },
        ],
      },
      { focus: "Rates", instruments: [] },
      {
        focus: "US Indices",
        instruments: [
          {
            instrumentId: "SPX500",
            displaySymbol: "S&P 500",
            name: "S&P 500",
            format: {
              style: "decimal",
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            },
            last: 5214.5,
            changePercent: -0.12,
          },
        ],
      },
    ],
    commentary:
      "We expect policy guidance to lean hawkish until inflation cools materially. Volatility typically spikes across USD crosses as Powell takes the podium.",
    deskPlan: [
      "Stage trim orders on USDJPY longs into the statement window.",
      "Run correlation checks with equity index hedges before sizing adjustments.",
      "Shift post-event reviews to 60 minutes after the press conference.",
    ],
  },
  {
    id: "ecb-speakers",
    day: "Thu · 21 Mar",
    time: "09:30 GMT",
    title: "ECB speakers rotation",
    impact: "Medium",
    marketFocus: ["EUR", "European Banks"],
    marketHighlights: [
      {
        focus: "EUR",
        instruments: [
          {
            instrumentId: "EURUSD",
            displaySymbol: "EUR/USD",
            name: "Euro vs US dollar",
            format: {
              style: "decimal",
              minimumFractionDigits: 4,
              maximumFractionDigits: 4,
            },
            last: 1.0832,
            changePercent: 0.18,
          },
        ],
      },
      { focus: "European Banks", instruments: [] },
    ],
    commentary:
      "Lagarde, Villeroy, and Schnabel speak through the session with colour on June easing prospects.",
    deskPlan: [
      "Monitor EURUSD liquidity pockets for staged entries.",
      "Alert credit team for commentary on balance sheet normalization.",
    ],
  },
];

export default {
  title: "Magic Portfolio/EconomicCalendarSection",
  component: EconomicCalendarSection,
};

export const Default = () => <EconomicCalendarSection events={MOCK_EVENTS} />;

export const Loading = () => <EconomicCalendarSection events={[]} loading />;

export const ErrorState = () => (
  <EconomicCalendarSection
    events={[]}
    loading={false}
    error="We couldn’t reach the economic calendar service."
    onRetry={() => console.log("retry economic calendar")}
  />
);

export const Empty = () => (
  <EconomicCalendarSection events={[]} loading={false} />
);
