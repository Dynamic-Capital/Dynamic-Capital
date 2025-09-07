import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import HomeLanding from "@/components/miniapp/HomeLanding";
import PlanSection from "@/components/miniapp/PlanSection";
import CheckoutSection from "@/components/miniapp/CheckoutSection";
import { FAQSection } from "@/components/miniapp/FAQSection";
import { QuickActions } from "@/components/miniapp/QuickActions";
import { SubscriptionStatusCard } from "@/components/shared/SubscriptionStatusCard";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { useThemeSync } from "@/hooks/useThemeSync";
import { CurrencyProvider } from "@/hooks/useCurrency";
import { 
  Home, 
  Star, 
  User, 
  ShoppingCart,
  HelpCircle,
  Zap,
  Shield
} from "lucide-react";

export default function MiniApp() {
  useThemeSync();
  
  const [telegramData, setTelegramData] = useState<any>(null);
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
    }
  }, []);

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
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 safe-area-top">
        <div className="w-full max-w-md mx-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="sticky top-0 z-10 glass-card backdrop-blur-md border-b">
              <TabsList className="glass-card grid w-full grid-cols-7 h-16 p-1">
                <TabsTrigger value="home" className="glass-tab flex flex-col items-center gap-1 text-xs font-sf-pro rounded-lg">
                  <Home className="h-5 w-5" />
                  <span>Home</span>
                </TabsTrigger>
                <TabsTrigger value="plan" className="glass-tab flex flex-col items-center gap-1 text-xs font-sf-pro rounded-lg">
                  <Star className="h-5 w-5" />
                  <span>Plans</span>
                </TabsTrigger>
                <TabsTrigger value="checkout" className="glass-tab flex flex-col items-center gap-1 text-xs font-sf-pro rounded-lg">
                  <ShoppingCart className="h-5 w-5" />
                  <span>Buy</span>
                </TabsTrigger>
                <TabsTrigger value="status" className="glass-tab flex flex-col items-center gap-1 text-xs font-sf-pro rounded-lg">
                  <User className="h-5 w-5" />
                  <span>Status</span>
                </TabsTrigger>
                <TabsTrigger value="admin" className="glass-tab flex flex-col items-center gap-1 text-xs font-sf-pro rounded-lg">
                  <Shield className="h-5 w-5" />
                  <span>Admin</span>
                </TabsTrigger>
                <TabsTrigger value="actions" className="glass-tab flex flex-col items-center gap-1 text-xs font-sf-pro rounded-lg">
                  <Zap className="h-5 w-5" />
                  <span>Actions</span>
                </TabsTrigger>
                <TabsTrigger value="help" className="glass-tab flex flex-col items-center gap-1 text-xs font-sf-pro rounded-lg">
                  <HelpCircle className="h-5 w-5" />
                  <span>FAQ</span>
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="p-4 pb-6 safe-area-bottom">
              <TabsContent value="home" className="space-y-4">
                <HomeLanding telegramData={telegramData} />
              </TabsContent>

              <TabsContent value="plan" className="space-y-4">
                <PlanSection />
              </TabsContent>

              <TabsContent value="checkout" className="space-y-4">
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
              </TabsContent>

              <TabsContent value="status" className="space-y-4">
                <SubscriptionStatusCard telegramData={telegramData} />
              </TabsContent>

              <TabsContent value="admin" className="space-y-4">
                <AdminDashboard telegramData={telegramData} />
              </TabsContent>

              <TabsContent value="actions" className="space-y-4">
                <QuickActions />
              </TabsContent>

              <TabsContent value="help" className="space-y-4">
                <FAQSection />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </CurrencyProvider>
  );
}