import { Card } from "@/components/ui/card";
import { currencies, currencyStrength } from "@/lib/mock-data";

export function StrengthMeter() {
  const maxStrength = Math.max(
    ...currencyStrength.map((c) => Math.abs(c.strength)),
  );

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Currency Strength</h3>
      <div className="space-y-3">
        {currencyStrength.map((currency) => {
          const currencyInfo = currencies.find((c) => c.code === currency.code);
          const isBullish = currency.strength > 0;
          const percentage = (Math.abs(currency.strength) / maxStrength) * 100;

          return (
            <div key={currency.code} className="flex items-center gap-3">
              <div className="flex items-center gap-2 w-20">
                <span className="text-lg">{currencyInfo?.flag}</span>
                <span className="text-sm font-medium">{currency.code}</span>
              </div>

              <div className="flex-1 h-8 bg-muted rounded-full overflow-hidden relative">
                <div
                  className={`absolute h-full rounded-full transition-all duration-300 ${
                    isBullish ? "bg-success right-1/2" : "bg-error left-1/2"
                  }`}
                  style={{
                    width: `${percentage / 2}%`,
                  }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-medium">
                    {currency.strength}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
