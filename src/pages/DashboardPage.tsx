import { WalletCard } from "@/components/trading/WalletCard";
import { SignalsWidget } from "@/components/trading/SignalsWidget";
import { Card } from "@/components/ui/card";
import { walletData, poolTrading } from "@/lib/mock-data";
import { ArrowUpRight } from "lucide-react";

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <h1 className="text-3xl font-bold mb-8">Trading Dashboard</h1>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-6">
          <div className="lg:col-span-2">
            <WalletCard />
          </div>
          
          <div>
            <SignalsWidget />
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 mb-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm text-muted-foreground">Address</h3>
              <div className="w-12 h-12 rounded-full bg-error" />
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Wallet</p>
                <p className="text-xl font-bold text-success">{walletData.wallet}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Trading</p>
                <p className="text-xl font-bold text-success">{walletData.trading}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Staking</p>
                <p className="text-base font-medium">{walletData.staking}</p>
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button className="flex-1 px-4 py-2 text-sm rounded-lg border border-border hover:bg-muted transition-colors">
                Transfer
              </button>
              <button className="flex-1 px-4 py-2 text-sm rounded-lg border border-border hover:bg-muted transition-colors">
                Deposit
              </button>
              <button className="flex-1 px-4 py-2 text-sm rounded-lg border border-border hover:bg-muted transition-colors">
                Withdraw
              </button>
            </div>
          </Card>

          <Card className="p-6 bg-error text-error-foreground">
            <h2 className="text-2xl font-bold mb-4">{poolTrading.title}</h2>
            <div className="mb-6">
              <p className="text-sm mb-2 flex items-center gap-1">
                {poolTrading.description} <ArrowUpRight className="w-4 h-4" />
              </p>
              <div className="h-24 flex items-end gap-1">
                {poolTrading.chartData.map((point, i) => (
                  <div
                    key={i}
                    className="flex-1 bg-success rounded-t"
                    style={{ height: `${(point.value / 200) * 100}%` }}
                  />
                ))}
              </div>
            </div>
            <div className="space-y-2 mb-6">
              <div className="flex justify-between items-center">
                <span className="text-sm">Growth</span>
                <span className="text-lg font-bold">{poolTrading.growth}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Success Rate</span>
                <span className="text-lg font-bold">{poolTrading.successRate}</span>
              </div>
            </div>
            <div className="flex justify-between items-center pt-4 border-t border-error-foreground/20">
              <button className="text-sm underline">Connect</button>
              <div className="text-right">
                <p className="text-xs opacity-80">Balance</p>
                <p className="text-lg font-bold">{poolTrading.balance}</p>
              </div>
            </div>
          </Card>
        </div>

        <Card className="p-6">
          <h2 className="text-xl font-bold mb-4">Dynamic Learn And Earn</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors cursor-pointer">
              <span>Dynamic mentorship</span>
              <ArrowUpRight className="w-4 h-4" />
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors cursor-pointer">
              <span>Dynamic Free course</span>
              <ArrowUpRight className="w-4 h-4" />
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors cursor-pointer">
              <span>Learn about Web3</span>
              <ArrowUpRight className="w-4 h-4" />
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors cursor-pointer">
              <span>Learn about DC Tokens</span>
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
