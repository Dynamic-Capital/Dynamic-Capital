import { Card } from "@/components/ui/card";
import { quadrantData } from "@/lib/mock-data";

export function QuadrantChart() {
  const centerX = 50;
  const centerY = 50;
  const scale = 30;

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Market Positioning</h3>
      
      <div className="relative aspect-square w-full max-w-2xl mx-auto">
        {/* Background quadrants */}
        <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
          {/* Top-left: Bearish but weakening */}
          <div className="bg-error/20 border border-error/30 flex items-center justify-center">
            <div className="text-center p-4">
              <p className="text-sm font-semibold text-error">BEARISH</p>
              <p className="text-xs text-error/80">BUT WEAKENING</p>
            </div>
          </div>
          
          {/* Top-right: Bullish */}
          <div className="bg-success/30 border border-success/40 flex items-center justify-center">
            <div className="text-center p-4">
              <p className="text-sm font-semibold text-success">BULLISH</p>
            </div>
          </div>
          
          {/* Bottom-left: Bearish */}
          <div className="bg-error/30 border border-error/40 flex items-center justify-center">
            <div className="text-center p-4">
              <p className="text-sm font-semibold text-error">BEARISH</p>
            </div>
          </div>
          
          {/* Bottom-right: Bullish but weakening */}
          <div className="bg-success/20 border border-success/30 flex items-center justify-center">
            <div className="text-center p-4">
              <p className="text-sm font-semibold text-success">BULLISH</p>
              <p className="text-xs text-success/80">BUT WEAKENING</p>
            </div>
          </div>
        </div>

        {/* Currency points */}
        {quadrantData.map((currency) => {
          const x = centerX + currency.x * scale;
          const y = centerY - (currency.y - 50) * 0.8;

          return (
            <div
              key={currency.code}
              className="absolute transform -translate-x-1/2 -translate-y-1/2"
              style={{
                left: `${x}%`,
                top: `${y}%`,
              }}
            >
              <div className="bg-background border-2 border-foreground rounded-full w-12 h-12 flex items-center justify-center shadow-lg">
                <span className="text-xs font-bold">{currency.code}</span>
              </div>
              <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-primary text-primary-foreground px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap">
                {currency.x > 0 ? "+" : ""}{currency.x.toFixed(1)}%
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex justify-between items-center mt-6 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <span>← PRICE vs.</span>
          <div className="bg-primary text-primary-foreground px-2 py-1 rounded">20</div>
          <span>SMA (%) →</span>
        </div>
      </div>
    </Card>
  );
}
