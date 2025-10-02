import { Card } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { trendData, currencies } from "@/lib/mock-data";

const currencyColors = {
  AUD: "#3B82F6",
  CAD: "#8B5CF6", 
  CHF: "#10B981",
  EUR: "#EC4899",
  GBP: "#14B8A6",
  JPY: "#F59E0B",
  NZD: "#6366F1",
  USD: "#EF4444",
};

export function TrendChart() {
  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Currency Trends</h3>
      
      <div className="flex flex-wrap gap-2 mb-4">
        {currencies.map((currency) => (
          <div
            key={currency.code}
            className="px-3 py-1.5 rounded-full border text-sm font-medium"
            style={{
              borderColor: currencyColors[currency.code as keyof typeof currencyColors],
              color: currencyColors[currency.code as keyof typeof currencyColors],
            }}
          >
            {currency.code}
          </div>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={trendData}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            dataKey="date"
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
          />
          <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
            }}
          />
          <Legend />
          {Object.keys(currencyColors).map((code) => (
            <Line
              key={code}
              type="monotone"
              dataKey={code}
              stroke={currencyColors[code as keyof typeof currencyColors]}
              strokeWidth={2}
              dot={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
}
