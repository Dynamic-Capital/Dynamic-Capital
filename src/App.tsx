import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useNavigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { AuthProvider } from "@/hooks/useAuth";
import Header from "./components/layout/Header";
import Landing from "./pages/Landing";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Education from "./pages/Education";
import BuildMiniApp from "./pages/BuildMiniApp";
import NotFound from "./pages/NotFound";
import AdminDashboard from "./pages/AdminDashboard";
import { WelcomeMessage } from "./components/welcome/WelcomeMessage";
import BotStatus from "./pages/BotStatus";
import Checkout from "./pages/Checkout";
import PaymentStatus from "./pages/PaymentStatus";
import MiniAppDemo from "./pages/MiniAppDemo";
import TelegramSetup from "./pages/TelegramSetup";
import MiniApp from "./pages/MiniApp";

const queryClient = new QueryClient();

// Component to handle Telegram redirect
const TelegramRedirect = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Check if opened in Telegram WebApp
    const isInTelegram = window.Telegram?.WebApp?.initData || 
                        window.location.search.includes('tgWebAppPlatform') ||
                        navigator.userAgent.includes('TelegramWebApp');
    
    // Only redirect from root path and if in Telegram
    if (location.pathname === '/' && isInTelegram) {
      navigate('/miniapp', { replace: true });
    }
  }, [navigate, location]);

  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <TelegramRedirect />
          <div className="min-h-screen bg-background">
            <Header />
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/dashboard" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/education" element={<Education />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/bot-status" element={<BotStatus />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/payment-status" element={<PaymentStatus />} />
              <Route path="/build-miniapp" element={<BuildMiniApp />} />
              <Route path="/miniapp-demo" element={<MiniAppDemo />} />
              <Route path="/telegram-setup" element={<TelegramSetup />} />
              <Route path="/miniapp" element={<MiniApp />} />
              <Route path="/welcome" element={<WelcomeMessage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
