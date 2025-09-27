import { type ReactNode } from "react";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  useNavigate,
} from "react-router-dom";
import { DynamicButton } from "./components/DynamicButton";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient();

function AppProviders({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-center mb-8">
          Welcome to Dynamic Capital
        </h1>
        <p className="text-center text-lg mb-8">
          Fast deposits for traders. Bank & crypto, verified.
        </p>
        <div className="text-center">
          <DynamicButton onClick={() => navigate("/checkout")}>
            Get Started
          </DynamicButton>
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
