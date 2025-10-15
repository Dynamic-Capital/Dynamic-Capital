import { UnifiedWalletConnect } from "@/components/web3/UnifiedWalletConnect";

export function WalletSection() {
  return (
    <section id="token" className="py-16">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl text-center space-y-6">
          <h2 className="text-4xl font-bold">Dynamic token</h2>
          <p className="text-muted-foreground">
            Manage your DCT position, connect TON wallets, and initiate treasury actions from one dependable interface.
          </p>
        </div>
        <div className="mx-auto mt-10 max-w-2xl">
          <UnifiedWalletConnect />
        </div>
      </div>
    </section>
  );
}

export default function Web3Page() {
  return (
    <div className="min-h-screen bg-background">
      <WalletSection />
    </div>
  );
}
