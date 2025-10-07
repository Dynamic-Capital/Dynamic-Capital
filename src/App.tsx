import { type ReactNode, useEffect } from "react";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Link,
  Navigate,
  useLocation,
} from "react-router-dom";
import Providers from "@/app/providers";
import { TonConnectProvider } from "@/integrations/tonconnect";
import { DynamicGuiShowcase } from "./components/DynamicGuiShowcase";
import CheckoutPage from "~/pages/CheckoutPage";
import NotFoundPage from "~/pages/NotFoundPage";
import { DashboardSection } from "@/pages/DashboardPage";
import { MarketSection } from "@/pages/MarketPage";
import { SnapshotSection } from "@/pages/SnapshotPage";
import { WalletSection } from "~/pages/Web3Page";
import { ChatSection } from "@/pages/ChatPage";
import { LayoutDashboard, TrendingUp, Camera, Wallet, MessageSquare } from "lucide-react";

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
  const location = useLocation();

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (location.hash) {
      const target = document.querySelector(location.hash);
      if (target instanceof HTMLElement) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [location.hash]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <section className="container mx-auto px-4 py-10">
        <DynamicGuiShowcase />
      </section>
      <DashboardSection />
      <MarketSection />
      <SnapshotSection />
      <WalletSection />
      <ChatSection />
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
              to="/#dashboard"
              className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors"
            >
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </Link>
            <Link
              to="/#market"
              className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors"
            >
              <TrendingUp className="w-4 h-4" />
              Market
            </Link>
            <Link
              to="/#snapshot"
              className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors"
            >
              <Camera className="w-4 h-4" />
              Snapshot
            </Link>
            <Link
              to="/#wallet"
              className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors"
            >
              <Wallet className="w-4 h-4" />
              Web3
            </Link>
            <Link
              to="/#chat"
              className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors"
            >
              <MessageSquare className="w-4 h-4" />
              Chat
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
              <Route path="/dashboard" element={<Navigate to="/#dashboard" replace />} />
              <Route path="/market" element={<Navigate to="/#market" replace />} />
              <Route path="/snapshot" element={<Navigate to="/#snapshot" replace />} />
              <Route path="/web3" element={<Navigate to="/#wallet" replace />} />
              <Route path="/chat" element={<Navigate to="/#chat" replace />} />
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
