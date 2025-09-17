import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ViewHeader } from "./ViewHeader";
import { BarChart3, MessageSquare, Package, Users } from "lucide-react";

interface AnalyticsViewProps {
  onBack: () => void;
}

export function AnalyticsView({ onBack }: AnalyticsViewProps) {
  return (
    <div className="space-y-6">
      <ViewHeader
        title="Revenue Analytics"
        description="Track revenue performance and package analytics"
        onBack={onBack}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6 bg-gradient-to-br from-background to-muted border-0 shadow-lg">
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">Today</p>
            <p className="text-2xl font-bold text-green-500">$1,240</p>
            <p className="text-xs text-muted-foreground">+12% vs yesterday</p>
          </div>
        </Card>
        <Card className="p-6 bg-gradient-to-br from-background to-muted border-0 shadow-lg">
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">This Week</p>
            <p className="text-2xl font-bold text-blue-500">$8,650</p>
            <p className="text-xs text-muted-foreground">+8% vs last week</p>
          </div>
        </Card>
        <Card className="p-6 bg-gradient-to-br from-background to-muted border-0 shadow-lg">
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">This Month</p>
            <p className="text-2xl font-bold text-purple-500">$32,420</p>
            <p className="text-xs text-muted-foreground">+5% vs last month</p>
          </div>
        </Card>
        <Card className="p-6 bg-gradient-to-br from-background to-muted border-0 shadow-lg">
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">Active Subscriptions</p>
            <p className="text-2xl font-bold text-telegram">1,248</p>
            <p className="text-xs text-muted-foreground">+42 new this week</p>
          </div>
        </Card>
      </div>

      <Card className="p-6 bg-gradient-to-br from-background to-muted border-0 shadow-lg">
        <h3 className="text-lg font-semibold mb-4">Revenue Trend (Last 30 Days)</h3>
        <div className="h-64 bg-background/30 rounded-lg flex items-center justify-center">
          <p className="text-muted-foreground">Chart visualization would go here</p>
        </div>
      </Card>

      <Card className="p-6 bg-gradient-to-br from-background to-muted border-0 shadow-lg">
        <h3 className="text-lg font-semibold mb-4">Analytics Actions</h3>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" size="sm" className="gap-2">
            <BarChart3 className="w-4 h-4" />
            Export Revenue Report
          </Button>
          <Button variant="outline" size="sm" className="gap-2">
            <Package className="w-4 h-4" />
            Package Performance Report
          </Button>
          <Button variant="outline" size="sm" className="gap-2">
            <Users className="w-4 h-4" />
            User Analytics
          </Button>
          <Button variant="default" size="sm" className="gap-2">
            <MessageSquare className="w-4 h-4" />
            Edit via Telegram
          </Button>
        </div>
      </Card>
    </div>
  );
}
