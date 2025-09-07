import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import HomeLanding from "@/components/miniapp/HomeLanding";
import PlanSection from "@/components/miniapp/PlanSection";
import CheckoutSection from "@/components/miniapp/CheckoutSection";
import { FAQSection } from "@/components/miniapp/FAQSection";
import { AskSection } from "@/components/miniapp/AskSection";
import { VipLaunchPromoPopup } from "@/components/miniapp/VipLaunchPromoPopup";
import { QuickActions } from "@/components/miniapp/QuickActions";
import { SubscriptionStatusCard } from "@/components/shared/SubscriptionStatusCard";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { useTheme } from "@/hooks/useTheme";
import { CurrencyProvider } from "@/hooks/useCurrency";
import { useTelegramAuth } from "@/hooks/useTelegramAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { ResponsiveMotion, FullscreenAdaptive, ViewportAware } from "@/components/ui/responsive-motion";
import { TabTransition } from "@/components/ui/route-transitions";
import { MicroButton } from "@/components/ui/micro-interactions";
import { 
  Home, 
  Star, 
  User, 
  ShoppingCart,
  HelpCircle,
  MessageSquare,
  Zap,
  Shield
} from "lucide-react";

export default function MiniApp() {
  const { currentTheme } = useTheme();
  const { telegramUser, isAdmin } = useTelegramAuth();
  const isMobile = useIsMobile();
  
  const [telegramData, setTelegramData] = useState<any>(null);
  const [showPromoPopup, setShowPromoPopup] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeTab, setActiveTab] = useState(() => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('tab') || 'home';
  });
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(() => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('plan');
  });
  const [promoCode, setPromoCode] = useState<string | null>(() => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('promo');
  });

  const isInTelegram = typeof window !== 'undefined' && window.Telegram?.WebApp;

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (tg) {
      tg.ready();
      tg.expand();
      
      setTelegramData({
        user: tg.initDataUnsafe?.user,
        platform: tg.platform,
        version: tg.version,
        colorScheme: tg.colorScheme,
        viewportHeight: tg.viewportHeight,
        isExpanded: tg.isExpanded
      });

      // Show promo popup after a short delay when mini app opens
      const hasShownPromo = localStorage.getItem('vip-launch-promo-shown');
      if (!hasShownPromo) {
        setTimeout(() => {
          setShowPromoPopup(true);
          localStorage.setItem('vip-launch-promo-shown', 'true');
        }, 2000);
      }
    }

    // Fullscreen detection
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const handleApplyPromo = (promoCode: string) => {
    // Navigate to plan tab with promo code
    const url = new URL(window.location.href);
    url.searchParams.set('tab', 'plan');
    url.searchParams.set('promo', promoCode);
    window.history.pushState({}, '', url.toString());
    setActiveTab('plan');
    setPromoCode(promoCode);
  };

  // Handle URL parameter changes
  useEffect(() => {
    const handlePopState = () => {
      const urlParams = new URLSearchParams(window.location.search);
      setActiveTab(urlParams.get('tab') || 'home');
      setSelectedPlanId(urlParams.get('plan'));
      setPromoCode(urlParams.get('promo'));
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  return (
    <CurrencyProvider>
      <FullscreenAdaptive
        className={`min-h-screen bg-gradient-to-br from-background via-background to-muted/30 dark:to-muted/20 safe-area-top transition-all duration-700 ${isFullscreen ? 'p-0' : ''}`}
        fullscreenScale={1}
        mobileScale={1}
        tabletScale={1}
        desktopScale={1}
      >
        <motion.div 
          className={`w-full ${isFullscreen ? 'max-w-full' : isMobile ? 'max-w-md' : 'max-w-2xl'} mx-auto transition-all duration-500`}
          layout
        >
          {/* Header with theme toggle */}
          <ResponsiveMotion 
            mobileVariant="slide" 
            desktopVariant="fade"
            className="sticky top-0 z-20 liquid-glass backdrop-blur-xl border-b border-border/40 ui-p-sm"
          >
            <div className="flex items-center justify-between">
              <motion.h1 
                className="text-body-lg font-semibold text-elevated drop-shadow-sm"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                Dynamic Capital VIP
              </motion.h1>
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
              >
                <ThemeToggle variant="glass" size="sm" />
              </motion.div>
            </div>
          </ResponsiveMotion>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <ResponsiveMotion 
              mobileVariant="fade" 
              desktopVariant="slide"
              delay={0.1}
              className="sticky top-14 z-10 glass-card backdrop-blur-md border-b"
            >
              <TabsList className={`glass-card grid w-full ${isAdmin ? 'grid-cols-8' : 'grid-cols-7'} ${isMobile ? 'h-16' : 'h-18'} p-1 transition-all duration-300`}>
                <TabsTrigger value="home" className="glass-tab flex flex-col items-center gap-1 text-xs font-sf-pro rounded-lg transition-all duration-200 hover:scale-105">
                  <motion.div
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Home className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'}`} />
                  </motion.div>
                  <span className={isMobile ? 'text-xs' : 'text-sm'}>Home</span>
                </TabsTrigger>
                <TabsTrigger value="plan" className="glass-tab flex flex-col items-center gap-1 text-xs font-sf-pro rounded-lg transition-all duration-200 hover:scale-105">
                  <motion.div whileHover={{ scale: 1.1, rotate: 5 }} whileTap={{ scale: 0.95 }}>
                    <Star className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'}`} />
                  </motion.div>
                  <span className={isMobile ? 'text-xs' : 'text-sm'}>Plans</span>
                </TabsTrigger>
                <TabsTrigger value="checkout" className="glass-tab flex flex-col items-center gap-1 text-xs font-sf-pro rounded-lg transition-all duration-200 hover:scale-105">
                  <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                    <ShoppingCart className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'}`} />
                  </motion.div>
                  <span className={isMobile ? 'text-xs' : 'text-sm'}>Buy</span>
                </TabsTrigger>
                <TabsTrigger value="status" className="glass-tab flex flex-col items-center gap-0.5 text-xs font-sf-pro rounded-lg py-2 px-1 transition-all duration-200 hover:scale-105">
                  <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                    <User className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'}`} />
                  </motion.div>
                  <span className={isMobile ? 'text-xs' : 'text-sm'}>Status</span>
                </TabsTrigger>
                {isAdmin && (
                  <TabsTrigger value="admin" className="glass-tab flex flex-col items-center gap-0.5 text-xs font-sf-pro rounded-lg py-2 px-1 transition-all duration-200 hover:scale-105">
                    <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                      <Shield className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'}`} />
                    </motion.div>
                    <span className={isMobile ? 'text-xs' : 'text-sm'}>Admin</span>
                  </TabsTrigger>
                )}
                <TabsTrigger value="ask" className="glass-tab flex flex-col items-center gap-0.5 text-xs font-sf-pro rounded-lg py-2 px-1 transition-all duration-200 hover:scale-105">
                  <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                    <MessageSquare className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'}`} />
                  </motion.div>
                  <span className={isMobile ? 'text-xs' : 'text-sm'}>Ask</span>
                </TabsTrigger>
                <TabsTrigger value="actions" className="glass-tab flex flex-col items-center gap-0.5 text-xs font-sf-pro rounded-lg py-2 px-1 transition-all duration-200 hover:scale-105">
                  <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                    <Zap className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'}`} />
                  </motion.div>
                  <span className={isMobile ? 'text-xs' : 'text-sm'}>Actions</span>
                </TabsTrigger>
                <TabsTrigger value="help" className="glass-tab flex flex-col items-center gap-0.5 text-xs font-sf-pro rounded-lg py-2 px-1 transition-all duration-200 hover:scale-105">
                  <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                    <HelpCircle className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'}`} />
                  </motion.div>
                  <span className={isMobile ? 'text-xs' : 'text-sm'}>FAQ</span>
                </TabsTrigger>
              </TabsList>
            </ResponsiveMotion>

            <motion.div 
              className={`${isMobile ? 'p-4' : 'p-6'} pb-24 safe-area-bottom`}
              layout
            >
              <TabTransition tabKey={activeTab}>
                <TabsContent value="home" className="space-y-4">
                  <ViewportAware>
                    <HomeLanding telegramData={telegramData} />
                  </ViewportAware>
                </TabsContent>

                  <TabsContent value="plan" className="space-y-4">
                    <ViewportAware>
                      <PlanSection />
                    </ViewportAware>
                  </TabsContent>

                  <TabsContent value="checkout" className="space-y-4">
                    <ViewportAware>
                      <CheckoutSection 
                        selectedPlanId={selectedPlanId || undefined}
                        promoCode={promoCode || undefined}
                        onBack={() => {
                          const url = new URL(window.location.href);
                          url.searchParams.set('tab', 'plan');
                          url.searchParams.delete('plan');
                          url.searchParams.delete('promo');
                          window.history.pushState({}, '', url.toString());
                          setActiveTab('plan');
                          setSelectedPlanId(null);
                          setPromoCode(null);
                        }}
                      />
                    </ViewportAware>
                  </TabsContent>

                  <TabsContent value="status" className="space-y-4">
                    <ViewportAware>
                      <SubscriptionStatusCard telegramData={telegramData} />
                    </ViewportAware>
                  </TabsContent>

                  {isAdmin && (
                    <TabsContent value="admin" className="space-y-4">
                      <ViewportAware>
                        <AdminDashboard telegramData={telegramData} />
                      </ViewportAware>
                    </TabsContent>
                  )}

                  <TabsContent value="ask" className="space-y-4">
                    <ViewportAware>
                      <AskSection />
                    </ViewportAware>
                  </TabsContent>

                  <TabsContent value="actions" className="space-y-4">
                    <ViewportAware>
                      <QuickActions />
                    </ViewportAware>
                  </TabsContent>

                <TabsContent value="help" className="space-y-4">
                  <ViewportAware>
                    <FAQSection />
                  </ViewportAware>
                </TabsContent>
              </TabTransition>
            </motion.div>
          </Tabs>

          {/* VIP Launch Promo Popup */}
          <AnimatePresence>
            {showPromoPopup && (
              <VipLaunchPromoPopup
                isOpen={showPromoPopup}
                onClose={() => setShowPromoPopup(false)}
                onApplyPromo={handleApplyPromo}
              />
            )}
          </AnimatePresence>
        </motion.div>
      </FullscreenAdaptive>
    </CurrencyProvider>
  );
}