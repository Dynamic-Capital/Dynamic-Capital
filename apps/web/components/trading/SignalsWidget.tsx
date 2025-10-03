import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity } from "lucide-react";
import { dynamicSignals } from "@/lib/mock-data";

export function SignalsWidget() {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Activity className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">Dynamic Signals</h3>
            <Badge
              variant="outline"
              className="mt-1 bg-success/10 text-success border-success/20"
            >
              {dynamicSignals.status}
            </Badge>
          </div>
        </div>

        <div className="flex gap-1">
          {dynamicSignals.indicators.map((indicator, i) => (
            <div
              key={i}
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                indicator.color === "success"
                  ? "bg-success text-success-foreground"
                  : indicator.color === "warning"
                  ? "bg-warning text-warning-foreground"
                  : "bg-error text-error-foreground"
              }`}
            >
              {indicator.count}
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
