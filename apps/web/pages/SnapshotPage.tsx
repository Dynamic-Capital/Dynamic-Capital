import { QuadrantChart } from "@/components/trading/QuadrantChart";
import { Card } from "@/components/ui/card";
import { Pause, Play } from "lucide-react";
import { useState } from "react";

export function SnapshotSection() {
  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <section id="snapshot" className="py-16">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="mb-8 flex items-center justify-between">
          <h2 className="text-3xl font-bold">Market Snapshot</h2>

          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              Thursday Oct 2 17:56
            </span>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="rounded-lg bg-muted p-2 transition-colors hover:bg-muted/80"
            >
              {isPlaying
                ? <Pause className="h-5 w-5" />
                : <Play className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <QuadrantChart />

          <Card className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Replay Timeline</h3>
              <div className="flex gap-2">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-primary" />
                  <span className="text-sm">20 SMA</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-secondary" />
                  <span className="text-sm">5 SMA</span>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="h-2 rounded-full bg-muted">
                <div className="h-full w-1/2 rounded-full bg-primary" />
              </div>
              <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                <span>Sep 5</span>
                <span>Sep 17</span>
                <span>Sep 30</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}

export default function SnapshotPage() {
  return (
    <div className="min-h-screen bg-background">
      <SnapshotSection />
    </div>
  );
}
