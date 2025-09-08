import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, useNavigate, useLocation } from "react-router-dom";
import { useEffect, Suspense } from "react";
import { AnimatePresence, LayoutGroup } from "framer-motion";
import { AuthProvider } from "@/hooks/useAuth";
import { TelegramAuthProvider } from "@/hooks/useTelegramAuth";
import { AdminAuthProvider } from "@/hooks/useAdminAuth";
import { useTheme } from "@/hooks/useTheme";
import { MotionThemeProvider } from "@/components/ui/motion-theme";
import { ScrollProgressBar } from "@/components/ui/scroll-progress";
import Header from "./components/layout/Header";
import Footer from "./components/layout/Footer";
import MobileBottomNav from "./components/navigation/MobileBottomNav";
import SkipToContent from "./components/navigation/SkipToContent";
import { ChatAssistantWidget } from "@/components/shared/ChatAssistantWidget";
import appRoutes from "./routes";

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
      
      <div className="min-h-screen bg-background mobile-optimized">
        {!isInMiniApp && <Header />}

        <main
          id="main-content"
          className={isInMiniApp ? '' : 'pb-20 md:pb-0 safe-area-bottom'}
          role="main"
          tabIndex={-1}
        >
          <LayoutGroup>
            <AnimatePresence mode="wait">
              <Suspense fallback={<div className="p-4 text-center">Loading...</div>}>
                <Routes location={location} key={location.pathname}>{appRoutes}</Routes>
              </Suspense>
            </AnimatePresence>
          </LayoutGroup>
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
