import { type ReactNode } from "react";
import { BrowserRouter as Router, Route, Routes, Link } from "react-router-dom";
import Providers from "@/app/providers";
import { TonConnectProvider } from "@/integrations/tonconnect";
import { DynamicGuiShowcase } from "./components/DynamicGuiShowcase";
import CheckoutPage from "~/pages/CheckoutPage";
import NotFoundPage from "~/pages/NotFoundPage";
import DashboardPage from "@/pages/DashboardPage";
import MarketPage from "@/pages/MarketPage";
import SnapshotPage from "@/pages/SnapshotPage";
import Web3Page from "~/pages/Web3Page";
import { LayoutDashboard, TrendingUp, Camera, Wallet } from "lucide-react";

function AppProviders({ children }: { children: ReactNode }) {
  return (
    <Providers>
      <TonConnectProvider>
        {children}
      </TonConnectProvider>
    </Providers>
  );
}

function HomePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-10">
        <DynamicGuiShowcase />
      </div>
    </div>
  );
}

function SiteFooter() {
  return (
    <footer className="bg-muted border-t">
      <div className="container mx-auto px-4 py-8">
        <p className="text-center text-muted-foreground">
          © 2024 Dynamic Capital. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

function SiteHeader() {
  return (
    <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="text-xl font-bold">
            Dynamic Capital
          </Link>
          <nav className="flex gap-6">
            <Link
              to="/dashboard"
              className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors"
            >
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </Link>
            <Link
              to="/market"
              className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors"
            >
              <TrendingUp className="w-4 h-4" />
              Market
            </Link>
            <Link
              to="/snapshot"
              className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors"
            >
              <Camera className="w-4 h-4" />
              Snapshot
            </Link>
            <Link
              to="/web3"
              className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors"
            >
              <Wallet className="w-4 h-4" />
              Web3
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}

function App() {
  return (
    <AppProviders>
      <Router>
        <div className="min-h-screen flex flex-col">
          <SiteHeader />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/market" element={<MarketPage />} />
              <Route path="/snapshot" element={<SnapshotPage />} />
              <Route path="/web3" element={<Web3Page />} />
              <Route path="/checkout" element={<CheckoutPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </main>
          <SiteFooter />
        </div>
      </Router>
    </AppProviders>
  );
}

export default App;
