import { type ReactNode } from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import ChatPage from "./pages/ChatPage";
import CheckoutPage from "./pages/CheckoutPage";
import HomePage from "./pages/HomePage";
import NotFoundPage from "./pages/NotFoundPage";

const queryClient = new QueryClient();

function AppProviders({ children }: { children: ReactNode }) {
  return <>{children}</>;
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
                <Route path="/chat" element={<ChatPage />} />
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
