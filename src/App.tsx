import { type ReactNode } from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import HeroAnimation from "./components/HeroAnimation";

const queryClient = new QueryClient();

function AppProviders({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

function HomePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="relative overflow-hidden">
        <div className="hero-page-gradient" aria-hidden />
        <div className="relative z-10 container mx-auto px-4 py-16 md:py-24">
          <div className="grid gap-16 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] xl:gap-20">
            <div className="max-w-xl space-y-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/40 px-4 py-2 text-xs font-semibold uppercase tracking-[0.32em] text-primary shadow-sm shadow-primary/20 backdrop-blur-md dark:border-white/10 dark:bg-white/10">
                <span className="hero-spark" aria-hidden />
                Dynamic liquidity engine
              </div>
              <div className="space-y-6">
                <h1 className="text-4xl font-semibold leading-tight text-foreground sm:text-5xl lg:text-6xl">
                  Precise capital in motion for every trading moment
                </h1>
                <p className="text-lg text-muted-foreground">
                  Orchestrate lightning-fast deposits across bank and crypto rails with proactive compliance, unified treasury controls, and real-time risk intelligence.
                </p>
              </div>
              <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
                <a
                  href="/checkout"
                  className="inline-flex items-center justify-center rounded-full bg-primary px-8 py-3 text-sm font-semibold uppercase tracking-[0.28em] text-primary-foreground transition-transform duration-300 hover:scale-[1.03] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
                >
                  Get Started
                </a>
                <div className="flex flex-col gap-1 text-sm text-muted-foreground/90">
                  <span className="font-semibold text-foreground">99.98% uptime</span>
                  <span>Dedicated settlement desks in New York, London & Singapore</span>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  "Programmatic compliance",
                  "Adaptive risk scoring",
                  "Treasury automation",
                ].map((capability) => (
                  <div
                    key={capability}
                    className="flex items-center gap-3 rounded-2xl border border-white/20 bg-white/50 px-4 py-3 text-sm font-medium text-foreground shadow-sm shadow-primary/10 backdrop-blur-md hero-capability-pill dark:border-white/10 dark:bg-white/10"
                  >
                    <span className="hero-status-dot" aria-hidden />
                    {capability}
                  </div>
                ))}
              </div>
            </div>
            <HeroAnimation />
          </div>
        </div>
      </div>
    </div>
  );
}

function CheckoutPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-center mb-8">
          Checkout
        </h1>
        <p className="text-center">
          Checkout functionality coming soon...
        </p>
      </div>
    </div>
  );
}

function NotFoundPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-center mb-8">
          404 - Page Not Found
        </h1>
        <p className="text-center">
          The page you're looking for doesn't exist.
        </p>
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

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppProviders>
        <Router>
          <div className="min-h-screen flex flex-col">
            <main className="flex-1">
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/checkout" element={<CheckoutPage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </main>
            <SiteFooter />
          </div>
        </Router>
      </AppProviders>
    </QueryClientProvider>
  );
}

export default App;
