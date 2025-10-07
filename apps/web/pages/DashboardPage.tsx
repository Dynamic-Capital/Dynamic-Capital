import { WalletCard } from "@/components/trading/WalletCard";
import { SignalsWidget } from "@/components/trading/SignalsWidget";
import { Card } from "@/components/ui/card";
import { poolTrading, walletData } from "@/lib/mock-data";
import { ArrowUpRight } from "lucide-react";

export function DashboardSection() {
  return (
    <section id="dashboard" className="py-16">
      <div className="container mx-auto px-4 max-w-7xl">
        <h2 className="text-3xl font-bold mb-8">Trading Dashboard</h2>

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
                <p className="text-xl font-bold text-success">
                  {walletData.wallet}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Trading</p>
                <p className="text-xl font-bold text-success">
                  {walletData.trading}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Staking</p>
                <p className="text-base font-medium">{walletData.staking}</p>
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button className="flex-1 px-4 py-2 text-sm rounded-lg border border-border transition-colors hover:bg-muted">
                Transfer
              </button>
              <button className="flex-1 px-4 py-2 text-sm rounded-lg border border-border transition-colors hover:bg-muted">
                Deposit
              </button>
              <button className="flex-1 px-4 py-2 text-sm rounded-lg border border-border transition-colors hover:bg-muted">
                Withdraw
              </button>
            </div>
          </Card>

          <Card className="p-6 bg-error text-error-foreground">
            <h3 className="text-2xl font-bold mb-4">{poolTrading.title}</h3>
            <div className="mb-6">
              <p className="text-sm mb-2 flex items-center gap-1">
                {poolTrading.description} <ArrowUpRight className="h-4 w-4" />
              </p>
              <div className="flex h-24 items-end gap-1">
                {poolTrading.chartData.map((point, index) => (
                  <div
                    key={index}
                    className="flex-1 rounded-t bg-success"
                    style={{ height: `${(point.value / 200) * 100}%` }}
                  />
                ))}
              </div>
            </div>
            <div className="mb-6 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Growth</span>
                <span className="text-lg font-bold">{poolTrading.growth}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Success Rate</span>
                <span className="text-lg font-bold">
                  {poolTrading.successRate}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-error-foreground/20 pt-4">
              <button className="text-sm underline">Connect</button>
              <div className="text-right">
                <p className="text-xs opacity-80">Balance</p>
                <p className="text-lg font-bold">{poolTrading.balance}</p>
              </div>
            </div>
          </Card>
        </div>

        <Card className="p-6">
          <h3 className="text-xl font-bold mb-4">Dynamic Learn And Earn</h3>
          <div className="space-y-3">
            <div className="flex cursor-pointer items-center justify-between rounded-lg p-3 transition-colors hover:bg-muted">
              <span>Dynamic mentorship</span>
              <ArrowUpRight className="h-4 w-4" />
            </div>
            <div className="flex cursor-pointer items-center justify-between rounded-lg p-3 transition-colors hover:bg-muted">
              <span>Dynamic Free course</span>
              <ArrowUpRight className="h-4 w-4" />
            </div>
            <div className="flex cursor-pointer items-center justify-between rounded-lg p-3 transition-colors hover:bg-muted">
              <span>Learn about Web3</span>
              <ArrowUpRight className="h-4 w-4" />
            </div>
            <div className="flex cursor-pointer items-center justify-between rounded-lg p-3 transition-colors hover:bg-muted">
              <span>Learn about DC Tokens</span>
              <ArrowUpRight className="h-4 w-4" />
            </div>
          </div>
        </Card>
      </div>
    </section>
  );
}

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-background">
      <DashboardSection />
    </div>
  );
}
