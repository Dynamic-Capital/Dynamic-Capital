import { UnifiedWalletConnect } from "@/components/web3/UnifiedWalletConnect";

export function WalletSection() {
  return (
    <section id="wallet" className="py-16">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-2xl">
          <h2 className="mb-8 text-4xl font-bold">Web3 Wallet</h2>
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
