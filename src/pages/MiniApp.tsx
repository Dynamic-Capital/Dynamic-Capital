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
import { MobileFloatingActionButton } from "@/components/ui/mobile-floating-action-button";
import { NetworkStatus, ErrorBoundary } from "@/components/ui/error-handling";
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
    <ErrorBoundary>
      <CurrencyProvider>
        <FullscreenAdaptive
          className={`min-h-screen bg-gradient-to-br from-background via-background to-muted/30 dark:to-muted/20 safe-area-top transition-all duration-700 ${isFullscreen ? 'p-0' : ''}`}
          fullscreenScale={1}
          mobileScale={1}
          tabletScale={1}
          desktopScale={1}
        >
          {/* Network Status Alert */}
          <NetworkStatus className="sticky top-0 z-50 mx-2 mt-2" />
          <motion.div 
            className={`w-full ${
              isFullscreen ? 'max-w-full h-screen' : 
              isMobile ? 'max-w-sm sm:max-w-md' : 
              'max-w-xl lg:max-w-2xl xl:max-w-3xl'
            } mx-auto transition-all duration-500 min-h-0 flex flex-col`}
            layout
            style={{ maxHeight: isFullscreen ? '100vh' : telegramData?.viewportHeight ? `${telegramData.viewportHeight}px` : 'auto' }}
          >
           {/* Enhanced Header with dynamic sizing */}
           <motion.header
             className="sticky top-0 z-50 backdrop-blur-xl border-b border-border/40 safe-area-top"
             style={{ height: 'var(--header-height)' }}
             initial={{ opacity: 0, y: -20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ duration: 0.3 }}
           >
            <div className="flex items-center justify-between h-full px-3 sm:px-4">
              <motion.div 
                className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
              >
                <div className="touch-target flex items-center justify-center bg-gradient-brand rounded-full flex-shrink-0">
                  <span className="text-white font-bold text-xs sm:text-sm">DC</span>
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="text-sm sm:text-base font-semibold text-elevated leading-tight truncate">
                    Dynamic Capital
                  </h1>
                  <p className="text-xs text-muted-foreground leading-none truncate">
                    VIP Trading Bot
                  </p>
                </div>
              </motion.div>
              <motion.div
                className="flex-shrink-0"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
              >
                <ThemeToggle variant="glass" size="sm" />
              </motion.div>
            </div>
          </motion.header>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
             <motion.nav
               className="sticky top-[var(--header-height)] z-40 backdrop-blur-md border-b safe-area-left safe-area-right ui-border-glass"
               style={{ height: 'var(--tabs-height)' }}
               initial={{ opacity: 0, y: -10 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ duration: 0.3, delay: 0.1 }}
             >
              <TabsList className={`glass-card flex w-full h-full p-1 transition-all duration-300 ${
                isAdmin ? 'justify-between' : 'justify-evenly'
              } overflow-x-auto scrollbar-hide gap-0.5`}>
                {[
                  { value: "home", icon: Home, label: "Home" },
                  { value: "plan", icon: Star, label: "Plans" },
                  { value: "checkout", icon: ShoppingCart, label: "Buy" },
                  { value: "status", icon: User, label: "Status" },
                  ...(isAdmin ? [{ value: "admin", icon: Shield, label: "Admin" }] : []),
                  { value: "ask", icon: MessageSquare, label: "Ask" },
                  { value: "actions", icon: Zap, label: "Actions" },
                  { value: "help", icon: HelpCircle, label: "FAQ" }
                ].map((tab, index) => (
                  <TabsTrigger 
                    key={tab.value}
                    value={tab.value} 
                    className="touch-target glass-tab flex flex-col items-center justify-center gap-1 text-xs font-sf-pro rounded-lg transition-all duration-200 hover:scale-105 px-2 py-1 flex-1 min-w-0 max-w-20"
                  >
                    <motion.div
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <tab.icon className="h-4 w-4 sm:h-5 sm:w-5" />
                    </motion.div>
                    <span className="text-xs leading-none truncate">{tab.label}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </motion.nav>

             <motion.div 
               className="flex-1 overflow-auto px-3 sm:px-4 safe-area-bottom"
               style={{ 
                 paddingTop: 'calc(var(--header-height) + var(--tabs-height))',
                 marginTop: 'calc(-1 * (var(--header-height) + var(--tabs-height)))',
                 maxHeight: isFullscreen ? '100vh' : 
                           telegramData?.viewportHeight ? `${telegramData.viewportHeight}px` : 
                           '100vh' 
               }}
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

           {/* Mobile FAB for contact */}
           {isMobile && (
             <MobileFloatingActionButton
               variant="contact"
               position="bottom-right"
               onClick={() => {
                 if (isInTelegram) {
                   window.open('https://t.me/DynamicCapital_Support', '_blank');
                 } else {
                   window.open('https://t.me/Dynamic_VIP_BOT', '_blank');
                 }
               }}
               pulse={true}
               className="bottom-[calc(1rem+env(safe-area-inset-bottom))] right-[calc(1rem+env(safe-area-inset-right))]"
             />
           )}

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
  </ErrorBoundary>
  );
}