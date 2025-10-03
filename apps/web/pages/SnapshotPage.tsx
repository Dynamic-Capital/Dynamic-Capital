import { QuadrantChart } from "@/components/trading/QuadrantChart";
import { Card } from "@/components/ui/card";
import { Pause, Play } from "lucide-react";
import { useState } from "react";

export default function SnapshotPage() {
  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Market Snapshot</h1>

          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              Thursday Oct 2 17:56
            </span>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
            >
              {isPlaying
                ? <Pause className="w-5 h-5" />
                : <Play className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <QuadrantChart />

          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Replay Timeline</h3>
              <div className="flex gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-primary" />
                  <span className="text-sm">20 SMA</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-secondary" />
                  <span className="text-sm">5 SMA</span>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="h-2 bg-muted rounded-full">
                <div className="h-full w-1/2 bg-primary rounded-full" />
              </div>
              <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                <span>Sep 5</span>
                <span>Sep 17</span>
                <span>Sep 30</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
