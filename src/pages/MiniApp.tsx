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
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { ViewportAware } from '@/components/ui/responsive-motion';

// Component imports
import HomeLanding from '@/components/miniapp/HomeLanding';
import PlanSection from '@/components/miniapp/PlanSection';
import { EnhancedPaymentSection } from '@/components/miniapp/EnhancedPaymentSection';
import { MobilePaymentFlow } from '@/components/miniapp/MobilePaymentFlow';
import CheckoutSection from '@/components/miniapp/CheckoutSection';
import StatusSection from '@/components/miniapp/StatusSection';
import { FAQSection } from '@/components/miniapp/FAQSection';
import { AskSection } from '@/components/miniapp/AskSection';

// Types
interface Plan {
  id: string;
  name: string;
  price: number;
  currency: string;
  duration_months: number;
  is_lifetime: boolean;
  features: string[];
}

export default function MiniApp() {
  const [activeTab, setActiveTab] = useState('home');
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [paymentStep, setPaymentStep] = useState<'plan' | 'payment' | 'confirmation'>('plan');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const isMobile = useIsMobile();
  const containerRef = useRef<HTMLDivElement>(null);

  const tabs = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'plan', label: 'Plans', icon: CreditCard },
    { id: 'status', label: 'Status', icon: User },
    { id: 'faq', label: 'FAQ', icon: HelpCircle },
    { id: 'ask', label: 'Support', icon: MessageCircle },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'home':
        return (
          <div className="space-y-6">
            <HomeLanding telegramData={null} />
          </div>
        );
      case 'plan':
        if (selectedPlan && paymentStep === 'payment') {
          return (
            <EnhancedPaymentSection
              selectedPlan={selectedPlan}
              onBack={() => {
                setSelectedPlan(null);
                setPaymentStep('plan');
              }}
            />
          );
        }
        return (
          <PlanSection />
        );
      case 'status':
        return <StatusSection telegramData={null} />;
      case 'faq':
        return <FAQSection />;
      case 'ask':
        return <AskSection />;
      default:
        return <HomeLanding telegramData={null} />;
    }
  };

  return (
    <ErrorBoundary>
      <CurrencyProvider>
        <FullscreenAdaptive
          className={cn(
            "min-h-screen bg-gradient-to-br from-background via-background to-muted/30 dark:to-muted/20 mobile-optimized safe-area-top transition-all duration-700 relative font-inter",
            isFullscreen ? 'p-0' : '',
            isMobile ? 'mobile-scroll' : ''
          )}
          fullscreenScale={1}
        >
          <MobilePullToRefresh
            onRefresh={async () => {
              await new Promise(resolve => setTimeout(resolve, 1000));
            }}
          >
            <div ref={containerRef} className="relative min-h-screen z-0">
              {/* Main Content */}
              <div className="relative z-10">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full h-screen flex flex-col">
                  {/* Mobile Navigation - Now at top */}
                  <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-xl border-b border-border/50 shadow-sm">
                    <TabsList className="w-full h-14 bg-transparent p-1 rounded-none">
                      {tabs.map((tab) => (
                        <TabsTrigger
                          key={tab.id}
                          value={tab.id}
                          className={cn(
                            "relative flex-1 h-12 flex-col gap-1 text-xs font-medium rounded-lg mx-1",
                            "data-[state=active]:bg-dc-brand data-[state=active]:text-white data-[state=active]:shadow-lg",
                            "hover:bg-dc-brand/10 hover:text-dc-brand transition-all duration-200"
                          )}
                        >
                          <tab.icon className="h-4 w-4" />
                          <span className="text-[10px]">{tab.label}</span>
                          {activeTab === tab.id && (
                            <motion.div
                              layoutId="tabUnderline"
                              className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground"
                              />
                          )}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </div>

                  {/* Mobile Tab Content - Scrollable */}
                  <div className="flex-1 overflow-y-auto px-4 py-6">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3 }}
                        className="pb-6"
                      >
                        {renderTabContent()}
                      </motion.div>
                    </AnimatePresence>
                  </div>
                </Tabs>
              </div>
            </div>

            {/* Theme Toggle Button - Fixed bottom right */}
            <div className="fixed bottom-6 right-6 z-50 bg-background/80 backdrop-blur-sm rounded-full p-2 border border-border/50 shadow-lg">
              <ThemeToggle />
            </div>
          </MobilePullToRefresh>
        </FullscreenAdaptive>
      </CurrencyProvider>
    </ErrorBoundary>
  );
}