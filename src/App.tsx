import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useNavigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import { AuthProvider } from "@/hooks/useAuth";
import { TelegramAuthProvider } from "@/hooks/useTelegramAuth";
import { AdminAuthProvider } from "@/hooks/useAdminAuth";
import { useTheme } from "@/hooks/useTheme";
import { MotionThemeProvider, MotionPage } from "@/components/ui/motion-theme";
import { RouteTransition, PageWrapper } from "@/components/ui/route-transitions";
import { ScrollProgressBar } from "@/components/ui/scroll-progress";
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
import VipDashboard from "./pages/VipDashboard";
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
    <MotionThemeProvider>
      <ScrollProgressBar />
      <SkipToContent />
      <TelegramRedirect />
      
      <div className="min-h-[100dvh] bg-background">
        {!isInMiniApp && <Header />}
        
        <main 
          id="main-content"
          className={isInMiniApp ? '' : 'pb-20 md:pb-0'}
          role="main"
          tabIndex={-1}
        >
          <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
              <Route path="/" element={
                <RouteTransition variant="blur">
                  <PageWrapper><Landing /></PageWrapper>
                </RouteTransition>
              } />
              <Route path="/dashboard" element={
                <RouteTransition variant="fade">
                  <PageWrapper><Index /></PageWrapper>
                </RouteTransition>
              } />
              <Route path="/auth" element={
                <RouteTransition variant="slide">
                  <PageWrapper><Auth /></PageWrapper>
                </RouteTransition>
              } />
              <Route path="/plans" element={
                <RouteTransition variant="fade">
                  <PageWrapper><Plans /></PageWrapper>
                </RouteTransition>
              } />
              <Route path="/contact" element={
                <RouteTransition variant="fade">
                  <PageWrapper><Contact /></PageWrapper>
                </RouteTransition>
              } />
              <Route path="/vip-dashboard" element={
                <RouteTransition variant="fade">
                  <PageWrapper><VipDashboard /></PageWrapper>
                </RouteTransition>
              } />
              <Route path="/checkout" element={
                <RouteTransition variant="slide">
                  <PageWrapper><Checkout /></PageWrapper>
                </RouteTransition>
              } />
              <Route path="/payment-success" element={
                <RouteTransition variant="scale">
                  <PageWrapper><PaymentStatus /></PageWrapper>
                </RouteTransition>
              } />
              <Route path="/payment-canceled" element={
                <RouteTransition variant="fade">
                  <PageWrapper><PaymentStatus /></PageWrapper>
                </RouteTransition>
              } />
              <Route path="/payment-status" element={
                <RouteTransition variant="slide">
                  <PageWrapper><PaymentStatus /></PageWrapper>
                </RouteTransition>
              } />
              <Route path="/education" element={
                <RouteTransition variant="fade">
                  <PageWrapper><Education /></PageWrapper>
                </RouteTransition>
              } />
              <Route path="/admin" element={
                <RouteTransition variant="blur">
                  <PageWrapper><AdminDashboard /></PageWrapper>
                </RouteTransition>
              } />
              <Route path="/admin/system-health" element={
                <RouteTransition variant="fade">
                  <PageWrapper><AdminDashboard /></PageWrapper>
                </RouteTransition>
              } />
              <Route path="/bot-status" element={
                <RouteTransition variant="fade">
                  <PageWrapper><BotStatus /></PageWrapper>
                </RouteTransition>
              } />
              <Route path="/build-miniapp" element={
                <RouteTransition variant="slide">
                  <PageWrapper><BuildMiniApp /></PageWrapper>
                </RouteTransition>
              } />
              <Route path="/miniapp-demo" element={
                <RouteTransition variant="blur">
                  <PageWrapper background={false}><MiniAppDemo /></PageWrapper>
                </RouteTransition>
              } />
              <Route path="/telegram-setup" element={
                <RouteTransition variant="slide">
                  <PageWrapper><TelegramSetup /></PageWrapper>
                </RouteTransition>
              } />
              <Route path="/miniapp" element={
                <RouteTransition variant="blur">
                  <PageWrapper background={false}><MiniApp /></PageWrapper>
                </RouteTransition>
              } />
              <Route path="/welcome" element={
                <RouteTransition variant="fade">
                  <PageWrapper><WelcomeMessage /></PageWrapper>
                </RouteTransition>
              } />
              <Route path="*" element={
                <RouteTransition variant="fade">
                  <PageWrapper><NotFound /></PageWrapper>
                </RouteTransition>
              } />
            </Routes>
          </AnimatePresence>
        </main>
        
        <Footer compact={isInMiniApp} />
        {!isInMiniApp && <MobileBottomNav />}
        <ChatAssistantWidget />
      </div>
    </MotionThemeProvider>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TelegramAuthProvider>
      <AdminAuthProvider>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <AppContent />
            </BrowserRouter>
          </TooltipProvider>
        </AuthProvider>
      </AdminAuthProvider>
    </TelegramAuthProvider>
  </QueryClientProvider>
);

export default App;
