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
              } overflow-x-auto scrollbar-hide gap-0.5 relative`}>
                {/* Active tab indicator with enhanced animations */}
                <motion.div
                  className="absolute inset-y-1 bg-gradient-to-r from-primary/20 via-primary/30 to-primary/20 dark:from-primary/30 dark:via-primary/40 dark:to-primary/30 rounded-lg border border-primary/40 shadow-lg shadow-primary/20"
                  layoutId="activeTab"
                  initial={false}
                  animate={{
                    x: `calc(${[
                      { value: "home", icon: Home, label: "Home" },
                      { value: "plan", icon: Star, label: "Plans" },
                      { value: "checkout", icon: ShoppingCart, label: "Buy" },
                      { value: "status", icon: User, label: "Status" },
                      ...(isAdmin ? [{ value: "admin", icon: Shield, label: "Admin" }] : []),
                      { value: "ask", icon: MessageSquare, label: "Ask" },
                      { value: "actions", icon: Zap, label: "Actions" },
                      { value: "help", icon: HelpCircle, label: "FAQ" }
                    ].findIndex(tab => tab.value === activeTab) * 100}% + ${
                      [
                        { value: "home", icon: Home, label: "Home" },
                        { value: "plan", icon: Star, label: "Plans" },
                        { value: "checkout", icon: ShoppingCart, label: "Buy" },
                        { value: "status", icon: User, label: "Status" },
                        ...(isAdmin ? [{ value: "admin", icon: Shield, label: "Admin" }] : []),
                        { value: "ask", icon: MessageSquare, label: "Ask" },
                        { value: "actions", icon: Zap, label: "Actions" },
                        { value: "help", icon: HelpCircle, label: "FAQ" }
                      ].findIndex(tab => tab.value === activeTab) * 0.125
                    }rem)`,
                    scaleX: [0.9, 1.1, 1],
                    scaleY: [0.9, 1.05, 1]
                  }}
                  style={{
                    width: `calc(${100 / ([
                      { value: "home", icon: Home, label: "Home" },
                      { value: "plan", icon: Star, label: "Plans" },
                      { value: "checkout", icon: ShoppingCart, label: "Buy" },
                      { value: "status", icon: User, label: "Status" },
                      ...(isAdmin ? [{ value: "admin", icon: Shield, label: "Admin" }] : []),
                      { value: "ask", icon: MessageSquare, label: "Ask" },
                      { value: "actions", icon: Zap, label: "Actions" },
                      { value: "help", icon: HelpCircle, label: "FAQ" }
                    ].length)}% - 0.125rem)`
                  }}
                  transition={{
                    type: "spring",
                    stiffness: 400,
                    damping: 30,
                    mass: 0.8
                  }}
                >
                  {/* Animated shimmer effect */}
                  <motion.div
                    className="absolute inset-0 rounded-lg bg-gradient-to-r from-transparent via-white/20 to-transparent"
                    animate={{
                      x: ["-100%", "100%"]
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "linear"
                    }}
                  />
                </motion.div>
                
                {/* Magnetic hover effect container */}
                <motion.div
                  className="absolute inset-0 rounded-lg pointer-events-none"
                  animate={{
                    background: [
                      "radial-gradient(circle at 0% 0%, transparent 0%, transparent 100%)",
                      "radial-gradient(circle at 50% 50%, hsl(var(--primary) / 0.05) 0%, transparent 50%)",
                      "radial-gradient(circle at 100% 100%, transparent 0%, transparent 100%)"
                    ]
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                />
                
                {[
                  { value: "home", icon: Home, label: "Home" },
                  { value: "plan", icon: Star, label: "Plans" },
                  { value: "checkout", icon: ShoppingCart, label: "Buy" },
                  { value: "status", icon: User, label: "Status" },
                  ...(isAdmin ? [{ value: "admin", icon: Shield, label: "Admin" }] : []),
                  { value: "ask", icon: MessageSquare, label: "Ask" },
                  { value: "actions", icon: Zap, label: "Actions" },
                  { value: "help", icon: HelpCircle, label: "FAQ" }
                ].map((tab, index) => {
                  const isActive = activeTab === tab.value;
                  const tabsCount = [
                    { value: "home", icon: Home, label: "Home" },
                    { value: "plan", icon: Star, label: "Plans" },
                    { value: "checkout", icon: ShoppingCart, label: "Buy" },
                    { value: "status", icon: User, label: "Status" },
                    ...(isAdmin ? [{ value: "admin", icon: Shield, label: "Admin" }] : []),
                    { value: "ask", icon: MessageSquare, label: "Ask" },
                    { value: "actions", icon: Zap, label: "Actions" },
                    { value: "help", icon: HelpCircle, label: "FAQ" }
                  ].length;
                  
                  return (
                    <motion.div
                      key={tab.value}
                      className="relative flex-1 min-w-0 max-w-20"
                      initial={{ opacity: 0, y: 20, rotateX: -15 }}
                      animate={{ 
                        opacity: 1, 
                        y: 0, 
                        rotateX: 0,
                        transition: {
                          delay: index * 0.08,
                          type: "spring",
                          stiffness: 300,
                          damping: 25
                        }
                      }}
                      whileHover={{
                        y: -2,
                        scale: 1.02,
                        transition: { type: "spring", stiffness: 400, damping: 17 }
                      }}
                    >
                      <TabsTrigger 
                        value={tab.value} 
                        className="touch-target relative flex flex-col items-center justify-center gap-1 text-xs font-sf-pro rounded-lg transition-all duration-200 px-2 py-1 w-full h-full hover:bg-transparent data-[state=active]:bg-transparent z-10 group"
                        onClick={() => {
                          // Haptic feedback simulation
                          if (navigator.vibrate) {
                            navigator.vibrate(isActive ? [10] : [5, 5, 10]);
                          }
                        }}
                      >
                        <motion.div
                          className="flex flex-col items-center gap-1 relative"
                          whileHover={{ 
                            scale: isActive ? 1.15 : 1.08,
                            y: -3,
                            transition: { type: "spring", stiffness: 400, damping: 17 }
                          }}
                          whileTap={{ 
                            scale: isActive ? 1.05 : 0.95,
                            transition: { type: "spring", stiffness: 600, damping: 15 }
                          }}
                        >
                          {/* Magnetic hover area */}
                          <motion.div
                            className="absolute -inset-4 rounded-full"
                            whileHover={{
                              background: "radial-gradient(circle, hsl(var(--primary) / 0.1) 0%, transparent 70%)"
                            }}
                            transition={{ duration: 0.3 }}
                          />
                          
                          <motion.div
                            className="relative"
                            animate={{
                              rotate: isActive ? [0, -8, 8, 0] : 0,
                              scale: isActive ? [1, 1.1, 1] : 1,
                              transition: isActive ? {
                                duration: 0.8,
                                ease: "easeInOut",
                                times: [0, 0.3, 0.7, 1],
                                repeat: Infinity,
                                repeatDelay: 2
                              } : { duration: 0.2 }
                            }}
                            whileHover={{
                              rotate: [0, -5, 5, 0],
                              transition: { duration: 0.4, ease: "easeInOut" }
                            }}
                          >
                            <tab.icon className={`h-4 w-4 sm:h-5 sm:w-5 transition-all duration-300 ${
                              isActive ? 'text-primary drop-shadow-sm' : 'text-muted-foreground group-hover:text-foreground'
                            }`} />
                            
                            {/* Active state particle effect */}
                            {isActive && (
                              <>
                                {[...Array(3)].map((_, i) => (
                                  <motion.div
                                    key={i}
                                    className="absolute w-1 h-1 bg-primary/60 rounded-full"
                                    style={{
                                      top: "50%",
                                      left: "50%",
                                      x: "-50%",
                                      y: "-50%"
                                    }}
                                    animate={{
                                      x: [0, (i - 1) * 15, 0],
                                      y: [0, -10 - i * 3, 0],
                                      opacity: [0, 1, 0],
                                      scale: [0, 1, 0]
                                    }}
                                    transition={{
                                      duration: 1.5,
                                      delay: i * 0.2,
                                      repeat: Infinity,
                                      repeatDelay: 1
                                    }}
                                  />
                                ))}
                              </>
                            )}
                          </motion.div>
                          
                          <motion.span 
                            className={`text-xs leading-none truncate transition-all duration-300 ${
                              isActive ? 'text-primary font-semibold' : 'text-muted-foreground group-hover:text-foreground'
                            }`}
                            animate={{
                              scale: isActive ? 1.05 : 1,
                              fontWeight: isActive ? 600 : 400,
                              y: isActive ? [0, -1, 0] : 0
                            }}
                            transition={{ 
                              duration: isActive ? 1 : 0.2,
                              repeat: isActive ? Infinity : 0,
                              repeatDelay: isActive ? 2 : 0
                            }}
                          >
                            {tab.label}
                          </motion.span>
                        </motion.div>
                        
                        {/* Enhanced glow effect */}
                        <AnimatePresence>
                          {isActive && (
                            <motion.div
                              className="absolute inset-0 rounded-lg bg-primary/10 dark:bg-primary/20 border border-primary/20"
                              layoutId="tabGlow"
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ 
                                opacity: [0.5, 1, 0.5], 
                                scale: [0.95, 1, 0.95],
                                borderColor: ["hsl(var(--primary) / 0.2)", "hsl(var(--primary) / 0.4)", "hsl(var(--primary) / 0.2)"]
                              }}
                              exit={{ opacity: 0, scale: 0.8 }}
                              transition={{ 
                                duration: 2,
                                repeat: Infinity,
                                ease: "easeInOut"
                              }}
                            />
                          )}
                        </AnimatePresence>
                        
                        {/* Ripple effect on tap */}
                        <motion.div
                          className="absolute inset-0 rounded-lg bg-primary/5 dark:bg-primary/10 opacity-0 pointer-events-none"
                          whileHover={{ 
                            opacity: [0, 1, 0],
                            scale: [0.8, 1, 1.1]
                          }}
                          transition={{ duration: 0.6, ease: "easeOut" }}
                        />
                      </TabsTrigger>
                    </motion.div>
                  );
                })}
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
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, x: 20, scale: 0.95 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -20, scale: 0.95 }}
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 30,
                    mass: 0.8
                  }}
                >
                  <TabsContent value="home" className="space-y-4">
                    <ViewportAware>
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1, duration: 0.4 }}
                      >
                        <HomeLanding telegramData={telegramData} />
                      </motion.div>
                    </ViewportAware>
                  </TabsContent>

                  <TabsContent value="plan" className="space-y-4">
                    <ViewportAware>
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1, duration: 0.4 }}
                      >
                        <PlanSection />
                      </motion.div>
                    </ViewportAware>
                  </TabsContent>

                  <TabsContent value="checkout" className="space-y-4">
                    <ViewportAware>
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1, duration: 0.4 }}
                      >
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
                      </motion.div>
                    </ViewportAware>
                  </TabsContent>

                  <TabsContent value="status" className="space-y-4">
                    <ViewportAware>
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1, duration: 0.4 }}
                      >
                        <SubscriptionStatusCard telegramData={telegramData} />
                      </motion.div>
                    </ViewportAware>
                  </TabsContent>

                  {isAdmin && (
                    <TabsContent value="admin" className="space-y-4">
                      <ViewportAware>
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.1, duration: 0.4 }}
                        >
                          <AdminDashboard telegramData={telegramData} />
                        </motion.div>
                      </ViewportAware>
                    </TabsContent>
                  )}

                  <TabsContent value="ask" className="space-y-4">
                    <ViewportAware>
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1, duration: 0.4 }}
                      >
                        <AskSection />
                      </motion.div>
                    </ViewportAware>
                  </TabsContent>

                  <TabsContent value="actions" className="space-y-4">
                    <ViewportAware>
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1, duration: 0.4 }}
                      >
                        <QuickActions />
                      </motion.div>
                    </ViewportAware>
                  </TabsContent>

                  <TabsContent value="help" className="space-y-4">
                    <ViewportAware>
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1, duration: 0.4 }}
                      >
                        <FAQSection />
                      </motion.div>
                    </ViewportAware>
                  </TabsContent>
                </motion.div>
              </AnimatePresence>
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