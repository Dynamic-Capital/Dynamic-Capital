import { type MouseEvent, type ReactNode, useEffect } from "react";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Link,
  Navigate,
  useLocation,
  useNavigationType,
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
import AGIChat from "./pages/AGIChat";
import AIAnalytics from "./pages/AIAnalytics";
import MemoryRetrieval from "./pages/MemoryRetrieval";
import ProceduresRouting from "./pages/ProceduresRouting";
import { LayoutDashboard, TrendingUp, Camera, Wallet, MessageSquare, Sparkles, Activity, Database, GitBranch } from "lucide-react";

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "market", label: "Market", icon: TrendingUp },
  { id: "snapshot", label: "Snapshot", icon: Camera },
  { id: "wallet", label: "Web3", icon: Wallet },
  { id: "chat", label: "Chat", icon: MessageSquare },
];

const AI_NAV_ITEMS = [
  { path: "/agi-chat", label: "AGI Chat", icon: Sparkles },
  { path: "/analytics", label: "Analytics", icon: Activity },
  { path: "/memory", label: "Memory", icon: Database },
  { path: "/procedures", label: "Procedures", icon: GitBranch },
];

function getScrollBehavior(): ScrollBehavior {
  if (typeof window === "undefined") {
    return "auto";
  }

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  return prefersReducedMotion ? "auto" : "smooth";
}

function scrollToSection(hash: string, behavior: ScrollBehavior = getScrollBehavior()) {
  if (typeof window === "undefined") {
    return false;
  }

  const normalized = hash.startsWith("#") ? hash.slice(1) : hash;
  if (!normalized) {
    return false;
  }

  const target = document.getElementById(normalized);
  if (target instanceof HTMLElement) {
    target.scrollIntoView({ behavior, block: "start" });
    if (target.tabIndex < 0) {
      target.setAttribute("tabindex", "-1");
    }
    target.focus({ preventScroll: true });
    return true;
  }

  return false;
}

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
  const navigationType = useNavigationType();

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const behavior = navigationType === "POP" ? "auto" : getScrollBehavior();

    if (!location.hash || !scrollToSection(location.hash, behavior)) {
      window.scrollTo({ top: 0, behavior });
    }
  }, [location.key, location.hash, navigationType]);

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
  const location = useLocation();

  const handleNavClick = (targetHash: string) => (event: MouseEvent<HTMLAnchorElement>) => {
    if (location.pathname === "/" && location.hash === targetHash) {
      event.preventDefault();
      if (!scrollToSection(targetHash)) {
        window.scrollTo({ top: 0, behavior: getScrollBehavior() });
      }
    }
  };

  return (
    <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="text-xl font-bold">
            Dynamic Capital
          </Link>
          <nav className="flex gap-6">
            {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
              <Link
                key={id}
                to={`/#${id}`}
                onClick={handleNavClick(`#${id}`)}
                className="flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary"
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
            <div className="border-l pl-6 ml-2 flex gap-6">
              {AI_NAV_ITEMS.map(({ path, label, icon: Icon }) => (
                <Link
                  key={path}
                  to={path}
                  className="flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary"
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              ))}
            </div>
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
              <Route path="/agi-chat" element={<AGIChat />} />
              <Route path="/analytics" element={<AIAnalytics />} />
              <Route path="/memory" element={<MemoryRetrieval />} />
              <Route path="/procedures" element={<ProceduresRouting />} />
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
