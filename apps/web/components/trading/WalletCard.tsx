import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { walletData } from "@/lib/mock-data";

export function WalletCard() {
  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-sm text-muted-foreground mb-1">Balance</h3>
            <p className="text-3xl font-bold text-success">
              {walletData.balance}
            </p>
          </div>
          <Badge
            variant="outline"
            className="bg-success/10 text-success border-success/20"
          >
            Live
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="text-sm font-medium mb-1">Profit</h4>
            <p className="text-xl font-bold text-success">
              {walletData.profit.amount}
            </p>
            <div className="flex gap-2 text-xs text-muted-foreground mt-1">
              <span>Long {walletData.profit.long}</span>
              <span>Short {walletData.profit.short}</span>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium mb-1">Loss</h4>
            <p className="text-xl font-bold text-error">
              {walletData.loss.amount}
            </p>
            <div className="flex gap-2 text-xs text-muted-foreground mt-1">
              <span>Long {walletData.loss.long}</span>
              <span>Short {walletData.loss.short}</span>
            </div>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <button className="flex-1 px-4 py-2 text-sm rounded-lg border border-border hover:bg-muted transition-colors">
            Transfer
          </button>
          <button className="flex-1 px-4 py-2 text-sm rounded-lg border border-border hover:bg-muted transition-colors">
            Invest
          </button>
          <button className="flex-1 px-4 py-2 text-sm rounded-lg border border-border hover:bg-muted transition-colors">
            Trade Summary
          </button>
        </div>
      </div>
    </Card>
  );
}
