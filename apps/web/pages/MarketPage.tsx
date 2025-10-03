import { StrengthMeter } from "@/components/trading/StrengthMeter";
import { TrendChart } from "@/components/trading/TrendChart";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function MarketPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Market Analysis</h1>

          <Tabs defaultValue="currency" className="w-auto">
            <TabsList>
              <TabsTrigger value="stock">Stock</TabsTrigger>
              <TabsTrigger value="currency">Currency</TabsTrigger>
              <TabsTrigger value="commodities">Commodities</TabsTrigger>
              <TabsTrigger value="crypto">Crypto</TabsTrigger>
              <TabsTrigger value="index">Index</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <Tabs defaultValue="strength" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="strength">Currency Strength</TabsTrigger>
            <TabsTrigger value="heatmap">Currency Heat Map</TabsTrigger>
            <TabsTrigger value="volatility">Currency Volatility</TabsTrigger>
            <TabsTrigger value="trends">Volatility</TabsTrigger>
          </TabsList>

          <TabsContent value="strength" className="space-y-6">
            <StrengthMeter />
            <TrendChart />
          </TabsContent>

          <TabsContent value="heatmap">
            <div className="text-center py-12 text-muted-foreground">
              Heat map visualization coming soon...
            </div>
          </TabsContent>

          <TabsContent value="volatility">
            <div className="text-center py-12 text-muted-foreground">
              Volatility charts coming soon...
            </div>
          </TabsContent>

          <TabsContent value="trends">
            <div className="text-center py-12 text-muted-foreground">
              Trend analysis coming soon...
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
