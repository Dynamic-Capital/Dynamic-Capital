import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useNavigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { AuthProvider } from "@/hooks/useAuth";
import { TelegramAuthProvider } from "@/hooks/useTelegramAuth";
import { useTheme } from "@/hooks/useTheme";
import Header from "./components/layout/Header";
import Footer from "./components/layout/Footer";
import MobileBottomNav from "./components/navigation/MobileBottomNav";
import SkipToContent from "./components/navigation/SkipToContent";
import { ChatAssistantWidget } from "@/components/shared/ChatAssistantWidget";
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
import Plans from "./pages/Plans";
import Contact from "./pages/Contact";

const queryClient = new QueryClient();

// Component to handle Telegram redirect
const TelegramRedirect = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Enhanced Telegram detection
    const isInTelegram = Boolean(
      window.Telegram?.WebApp?.initData || 
      window.Telegram?.WebApp?.initDataUnsafe ||
      window.location.search.includes('tgWebAppPlatform') ||
      navigator.userAgent.includes('TelegramWebApp') ||
      window.parent !== window
    );
    
    // Only redirect from root path and if in Telegram
    if (location.pathname === '/' && isInTelegram) {
      navigate('/miniapp', { replace: true });
    }
  }, [navigate, location]);

  return null;
};

// Component to apply theme sync to the entire app
const AppContent = () => {
  useTheme();
  
  const location = useLocation();
  const isInMiniApp = location.pathname === '/miniapp';
  
  return (
    <>
      <SkipToContent />
      <TelegramRedirect />
      
      <div className="min-h-screen bg-background">
        {!isInMiniApp && <Header />}
        
        <main 
          id="main-content"
          className={isInMiniApp ? '' : 'pb-20 md:pb-0'}
          role="main"
          tabIndex={-1}
        >
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/dashboard" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/plans" element={<Plans />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/payment-success" element={<PaymentStatus />} />
            <Route path="/payment-canceled" element={<PaymentStatus />} />
            <Route path="/payment-status" element={<PaymentStatus />} />
            <Route path="/education" element={<Education />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/system-health" element={<AdminDashboard />} />
            <Route path="/bot-status" element={<BotStatus />} />
            <Route path="/build-miniapp" element={<BuildMiniApp />} />
            <Route path="/miniapp-demo" element={<MiniAppDemo />} />
            <Route path="/telegram-setup" element={<TelegramSetup />} />
            <Route path="/miniapp" element={<MiniApp />} />
            <Route path="/welcome" element={<WelcomeMessage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
        
        <Footer compact={isInMiniApp} />
        {!isInMiniApp && <MobileBottomNav />}
        {!isInMiniApp && <ChatAssistantWidget />}
      </div>
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TelegramAuthProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppContent />
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </TelegramAuthProvider>
  </QueryClientProvider>
);

export default App;
