import { UnifiedWalletConnect } from '@/components/web3/UnifiedWalletConnect';

export default function Web3Page() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-10">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-4xl font-bold mb-8">Web3 Wallet</h1>
          <UnifiedWalletConnect />
        </div>
      </div>
    </div>
  );
}
