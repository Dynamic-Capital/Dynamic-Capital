import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useScroll } from 'framer-motion';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Home, 
  CreditCard, 
  User, 
  HelpCircle, 
  MessageCircle, 
  Zap,
  Menu,
  X,
  ChevronDown,
  Settings,
  Shield
} from 'lucide-react';
import { MobileSwipeContainer, MobilePullToRefresh, TouchFeedback, MobileScrollIndicator } from '@/components/ui/mobile-gestures';
import { ThreeDEmoticon } from '@/components/ui/three-d-emoticons';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { MobileFloatingActionButton } from '@/components/ui/mobile-floating-action-button';
import { FullscreenAdaptive } from '@/components/ui/responsive-motion';
import { ErrorBoundary } from '@/components/ui/error-handling';
import { CurrencyProvider } from '@/hooks/useCurrency';
import { ViewportAware } from '@/components/ui/responsive-motion';

// Component imports
import HomeLanding from '@/components/miniapp/HomeLanding';
import PlanSection from '@/components/miniapp/PlanSection';
import CheckoutSection from '@/components/miniapp/CheckoutSection';
import StatusSection from '@/components/miniapp/StatusSection';
import { FAQSection } from '@/components/miniapp/FAQSection';
import { AskSection } from '@/components/miniapp/AskSection';
import { QuickActions } from '@/components/miniapp/QuickActions';
import { AdminDashboard } from '@/components/admin/AdminDashboard';
import { SubscriptionStatusCard } from '@/components/shared/SubscriptionStatusCard';

export default function MiniApp() {
  const [activeTab, setActiveTab] = useState('home');
  const [telegramData, setTelegramData] = useState<any>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [promoCode, setPromoCode] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const isInTelegram = typeof window !== 'undefined' && window.Telegram?.WebApp;

  // Check if user is admin (simplified check without external dependency)
  const isAdmin = telegramData?.user?.username && 
    ['dynamiccapital_support', 'admin'].includes(telegramData.user.username.toLowerCase());

  useEffect(() => {
    // Parse URL parameters on mount
    const urlParams = new URLSearchParams(window.location.search);
    setActiveTab(urlParams.get('tab') || 'home');
    setSelectedPlanId(urlParams.get('plan'));
    setPromoCode(urlParams.get('promo'));

    // Initialize Telegram Web App
    if (isInTelegram) {
      const tg = window.Telegram.WebApp;
      tg.ready();
      tg.expand();
      
      setTelegramData({
        user: tg.initDataUnsafe?.user,
        query_id: tg.initDataUnsafe?.query_id,
        auth_date: tg.initDataUnsafe?.auth_date,
        hash: tg.initDataUnsafe?.hash
      });

      // Enable closing confirmation
      tg.enableClosingConfirmation();
      
      // Set theme based on Telegram theme
      if (tg.colorScheme === 'dark') {
        document.documentElement.classList.add('dark');
      }
    }

    // Fullscreen detection
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    setIsLoading(false);
    
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

  const handleRefresh = async () => {
    // Simulate refresh action
    await new Promise(resolve => setTimeout(resolve, 1000));
    // Add actual refresh logic here
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <CurrencyProvider>
        <FullscreenAdaptive
          className={cn(
            "min-h-screen bg-gradient-to-br from-background via-background to-muted/30 dark:to-muted/20 mobile-optimized safe-area-top transition-all duration-700",
            isFullscreen ? 'p-0' : '',
            isMobile ? 'mobile-scroll' : ''
          )}
          fullscreenScale={1}
        >
          {/* Mobile Scroll Progress Indicator */}
          {isMobile && <MobileScrollIndicator scrollableRef={scrollRef} />}
          
          {/* Enhanced Mobile Tabs with Pull-to-Refresh */}
          <MobilePullToRefresh onRefresh={handleRefresh}>
            <Tabs 
              value={activeTab} 
              onValueChange={setActiveTab}
              className="w-full h-full flex flex-col"
            >
              {/* Mobile Header with Swipe Gesture */}
              <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b mobile-tabs safe-area-top">
                <MobileSwipeContainer
                  onSwipeLeft={() => {
                    const tabs = ['home', 'plan', 'status', 'help', 'ask'];
                    const currentIndex = tabs.indexOf(activeTab);
                    if (currentIndex < tabs.length - 1) {
                      setActiveTab(tabs[currentIndex + 1]);
                    }
                  }}
                  onSwipeRight={() => {
                    const tabs = ['home', 'plan', 'status', 'help', 'ask'];
                    const currentIndex = tabs.indexOf(activeTab);
                    if (currentIndex > 0) {
                      setActiveTab(tabs[currentIndex - 1]);
                    }
                  }}
                >
                  <div className="px-4 py-3">
                    <div className="flex items-center justify-between mb-3">
                      <motion.div 
                        className="flex items-center gap-2"
                        whileHover={{ scale: 1.02 }}
                      >
                        <ThreeDEmoticon emoji="💎" size={24} intensity={0.3} />
                        <h1 className="text-lg font-bold bg-gradient-to-r from-primary to-red-600 bg-clip-text text-transparent mobile-heading">
                          Dynamic Capital VIP
                        </h1>
                      </motion.div>
                      
                      {telegramData?.user && (
                        <TouchFeedback>
                          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 touch-target">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                            <span className="text-xs font-medium">Online</span>
                          </div>
                        </TouchFeedback>
                      )}
                    </div>

                    {/* Enhanced Mobile Tab Navigation */}
                    <TabsList className="grid w-full h-12 bg-muted/30 backdrop-blur-sm rounded-xl p-1">
                      <TabsTrigger 
                        value="home" 
                        className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all duration-200 touch-target mobile-focus-ring"
                      >
                        <TouchFeedback>
                          <div className="flex items-center gap-1.5">
                            <Home className="h-4 w-4" />
                            {!isMobile && <span className="text-xs font-medium">Home</span>}
                          </div>
                        </TouchFeedback>
                      </TabsTrigger>
                      
                      <TabsTrigger 
                        value="plan" 
                        className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all duration-200 touch-target mobile-focus-ring"
                      >
                        <TouchFeedback>
                          <div className="flex items-center gap-1.5">
                            <CreditCard className="h-4 w-4" />
                            {!isMobile && <span className="text-xs font-medium">Plans</span>}
                          </div>
                        </TouchFeedback>
                      </TabsTrigger>
                      
                      <TabsTrigger 
                        value="status" 
                        className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all duration-200 touch-target mobile-focus-ring"
                      >
                        <TouchFeedback>
                          <div className="flex items-center gap-1.5">
                            <User className="h-4 w-4" />
                            {!isMobile && <span className="text-xs font-medium">Status</span>}
                          </div>
                        </TouchFeedback>
                      </TabsTrigger>
                      
                      <TabsTrigger 
                        value="help" 
                        className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all duration-200 touch-target mobile-focus-ring"
                      >
                        <TouchFeedback>
                          <div className="flex items-center gap-1.5">
                            <HelpCircle className="h-4 w-4" />
                            {!isMobile && <span className="text-xs font-medium">Help</span>}
                          </div>
                        </TouchFeedback>
                      </TabsTrigger>
                      
                      <TabsTrigger 
                        value="ask" 
                        className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all duration-200 touch-target mobile-focus-ring"
                      >
                        <TouchFeedback>
                          <div className="flex items-center gap-1.5">
                            <MessageCircle className="h-4 w-4" />
                            {!isMobile && <span className="text-xs font-medium">Ask</span>}
                          </div>
                        </TouchFeedback>
                      </TabsTrigger>
                    </TabsList>
                  </div>
                </MobileSwipeContainer>
              </div>

              {/* Enhanced Mobile Content with Swipe Navigation */}
              <div 
                ref={scrollRef}
                className={cn(
                  "flex-1 overflow-y-auto overscroll-y-contain mobile-scroll",
                  isMobile && "safe-area-bottom"
                )}
                style={{ 
                  WebkitOverflowScrolling: 'touch',
                  scrollBehavior: 'smooth'
                }}
              >
                <motion.div 
                  className="min-h-full"
                  initial="hidden" 
                  animate="visible"
                >
                  <AnimatePresence mode="wait">
                    <TabsContent value="home" className="mt-0 space-y-4 px-4 pb-20">
                      <MobileSwipeContainer
                        onSwipeLeft={() => setActiveTab('plan')}
                        className="min-h-[calc(100vh-200px)] mobile-swipe-hint"
                      >
                        <ViewportAware>
                          <motion.div
                            key="home-content"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ delay: 0.1, duration: 0.4 }}
                            className="mobile-slide-up"
                          >
                            <HomeLanding telegramData={telegramData} />
                          </motion.div>
                        </ViewportAware>
                      </MobileSwipeContainer>
                    </TabsContent>

                    <TabsContent value="plan" className="mt-0 space-y-4 px-4 pb-20">
                      <MobileSwipeContainer
                        onSwipeLeft={() => setActiveTab('status')}
                        onSwipeRight={() => setActiveTab('home')}
                        className="min-h-[calc(100vh-200px)] mobile-swipe-hint"
                      >
                        <ViewportAware>
                          <motion.div
                            key="plan-content"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ delay: 0.1, duration: 0.4 }}
                            className="mobile-slide-up"
                          >
                            <PlanSection />
                          </motion.div>
                        </ViewportAware>
                      </MobileSwipeContainer>
                    </TabsContent>

                    <TabsContent value="status" className="mt-0 space-y-4 px-4 pb-20">
                      <MobileSwipeContainer
                        onSwipeLeft={() => setActiveTab('help')}
                        onSwipeRight={() => setActiveTab('plan')}
                        className="min-h-[calc(100vh-200px)] mobile-swipe-hint"
                      >
                        <ViewportAware>
                          <motion.div
                            key="status-content"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ delay: 0.1, duration: 0.4 }}
                            className="mobile-slide-up"
                          >
                            <SubscriptionStatusCard telegramData={telegramData} />
                          </motion.div>
                        </ViewportAware>
                      </MobileSwipeContainer>
                    </TabsContent>

                    <TabsContent value="help" className="mt-0 space-y-4 px-4 pb-20">
                      <MobileSwipeContainer
                        onSwipeLeft={() => setActiveTab('ask')}
                        onSwipeRight={() => setActiveTab('status')}
                        className="min-h-[calc(100vh-200px)] mobile-swipe-hint"
                      >
                        <ViewportAware>
                          <motion.div
                            key="help-content"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ delay: 0.1, duration: 0.4 }}
                            className="mobile-slide-up"
                          >
                            <FAQSection />
                          </motion.div>
                        </ViewportAware>
                      </MobileSwipeContainer>
                    </TabsContent>

                    <TabsContent value="ask" className="mt-0 space-y-4 px-4 pb-20">
                      <MobileSwipeContainer
                        onSwipeRight={() => setActiveTab('help')}
                        className="min-h-[calc(100vh-200px)]"
                      >
                        <ViewportAware>
                          <motion.div
                            key="ask-content"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ delay: 0.1, duration: 0.4 }}
                            className="mobile-slide-up"
                          >
                            <AskSection />
                          </motion.div>
                        </ViewportAware>
                      </MobileSwipeContainer>
                    </TabsContent>

                    {isAdmin && (
                      <TabsContent value="admin" className="mt-0 space-y-4 px-4 pb-20">
                        <ViewportAware>
                          <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1, duration: 0.4 }}
                            className="mobile-slide-up"
                          >
                            <AdminDashboard telegramData={telegramData} />
                          </motion.div>
                        </ViewportAware>
                      </TabsContent>
                    )}
                  </AnimatePresence>
                </motion.div>
              </div>
            </Tabs>
          </MobilePullToRefresh>

          {/* Enhanced Mobile FAB with Touch Feedback */}
          {isMobile && (
            <TouchFeedback haptic={true}>
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
                className="shadow-2xl mobile-gpu-accelerated"
              />
            </TouchFeedback>
          )}

          {/* Mobile Quick Actions FAB */}
          {isMobile && activeTab === 'home' && (
            <TouchFeedback haptic={true}>
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 1, type: "spring", stiffness: 260, damping: 20 }}
                className="fixed bottom-20 right-4 z-40 safe-area-bottom"
              >
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full shadow-lg bg-background/80 backdrop-blur-sm border-primary/30 mobile-button touch-target"
                  onClick={() => setActiveTab('plan')}
                >
                  <ThreeDEmoticon emoji="⚡" size={16} />
                  <span className="ml-1 text-xs">Quick Plan</span>
                </Button>
              </motion.div>
            </TouchFeedback>
          )}
        </FullscreenAdaptive>
      </CurrencyProvider>
    </ErrorBoundary>
  );
}