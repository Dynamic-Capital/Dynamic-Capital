import { Card } from "@/components/ui/card";
import { currencies, currencyStrength } from "@/lib/mock-data";

export function StrengthMeter() {
  const maxStrength = currencyStrength.reduce(
    (max, current) => Math.max(max, Math.abs(current.strength)),
    0,
  );
  const safeMaxStrength = maxStrength || 1;
  const legendId = "currency-strength-legend";

  return (
    <Card
      className="p-6"
      aria-labelledby="currency-strength-heading"
      aria-describedby="currency-strength-legend"
    >
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h3
          id="currency-strength-heading"
          className="text-lg font-semibold"
        >
          Currency strength
        </h3>
        <p id={legendId} className="text-xs text-muted-foreground">
          Green = buy pressure. Red = sell pressure.
        </p>
      </div>
      <ul className="space-y-3" role="list" aria-describedby={legendId}>
        {currencyStrength.map((currency) => {
          const currencyInfo = currencies.find((c) => c.code === currency.code);
          const isBullish = currency.strength > 0;
          const percentage = (Math.abs(currency.strength) / safeMaxStrength) *
            100;
          const widthPercent = Math.min(Math.round(percentage), 100);
          const directionText = isBullish ? "Buy" : "Sell";
          const gaugeId = `strength-${currency.code.toLowerCase()}`;

          return (
            <li key={currency.code} className="flex items-center gap-3">
              <div className="flex w-24 items-center gap-2">
                <span className="text-lg" aria-hidden>
                  {currencyInfo?.flag ?? ""}
                </span>
                <span className="text-sm font-medium">{currency.code}</span>
              </div>

              <div
                className="relative h-8 flex-1 overflow-hidden rounded-full bg-muted"
                role="meter"
                aria-labelledby={`${gaugeId}-label`}
                aria-valuemin={0}
                aria-valuemax={safeMaxStrength}
                aria-valuenow={Math.abs(currency.strength)}
                aria-valuetext={`${directionText} pressure ${
                  Math.abs(currency.strength)
                }`}
              >
                <span id={`${gaugeId}-label`} className="sr-only">
                  {currency.code} {directionText} pressure
                </span>
                <div className="absolute inset-y-0 right-1/2 w-1/2">
                  <div
                    className="absolute inset-y-0 right-0 h-full rounded-l-full bg-error transition-all duration-300"
                    style={{ width: isBullish ? "0%" : `${widthPercent}%` }}
                  />
                </div>
                <div className="absolute inset-y-0 left-1/2 w-1/2">
                  <div
                    className="absolute inset-y-0 left-0 h-full rounded-r-full bg-success transition-all duration-300"
                    style={{ width: isBullish ? `${widthPercent}%` : "0%" }}
                  />
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-medium">
                    {currency.strength}
                  </span>
                </div>
              </div>
              <span
                className={`hidden rounded-full px-2 py-1 text-xs font-medium sm:block ${
                  isBullish
                    ? "bg-success/10 text-success"
                    : "bg-error/10 text-error"
                }`}
              >
                {directionText}
              </span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
