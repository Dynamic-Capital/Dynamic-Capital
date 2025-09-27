import { type ReactNode } from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Providers from "@/app/providers";
import { DynamicGuiShowcase } from "./components/DynamicGuiShowcase";
import CheckoutPage from "~/pages/CheckoutPage";
import NotFoundPage from "~/pages/NotFoundPage";

function AppProviders({ children }: { children: ReactNode }) {
  return <Providers>{children}</Providers>;
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

function App() {
  return (
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
  );
}

export default App;
