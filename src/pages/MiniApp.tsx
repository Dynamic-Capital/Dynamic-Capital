import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  CreditCard, 
  Users, 
  TrendingUp, 
  Star, 
  Smartphone, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  User,
  Settings
} from "lucide-react";
import PlanSection from "@/components/miniapp/PlanSection";
import StatusSection from "@/components/miniapp/StatusSection";
import HomeLanding from "@/components/miniapp/HomeLanding";
import BrandLogo from "@/components/BrandLogo";
import { useThemeSync } from "@/hooks/useThemeSync";

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

interface TelegramWebApp {
  initData: string;
  initDataUnsafe: {
    user?: TelegramUser;
    start_param?: string;
  };
  version: string;
  platform: string;
  colorScheme: 'light' | 'dark';
  themeParams: Record<string, string>;
  isExpanded: boolean;
  viewportHeight: number;
  viewportStableHeight: number;
  ready: () => void;
  expand: () => void;
  close: () => void;
  MainButton: {
    text: string;
    color: string;
    textColor: string;
    isVisible: boolean;
    isActive: boolean;
    show: () => void;
    hide: () => void;
    enable: () => void;
    disable: () => void;
    setText: (text: string) => void;
    onClick: (callback: () => void) => void;
    offClick: (callback: () => void) => void;
  };
}

declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp;
    };
  }
}

export default function MiniApp() {
  useThemeSync();
  
  const [telegramData, setTelegramData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState(() => {
    // Get tab from URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('tab') || 'home';
  });
  const [version, setVersion] = useState<string>("");

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (tg) {
      tg.ready();
      tg.expand();
      
      // Set theme
      document.body.style.backgroundColor = tg.themeParams.bg_color || '#ffffff';
      document.body.style.color = tg.themeParams.text_color || '#000000';
      
      setTelegramData({
        user: tg.initDataUnsafe.user,
        platform: tg.platform,
        version: tg.version,
        colorScheme: tg.colorScheme,
        viewportHeight: tg.viewportHeight,
        isExpanded: tg.isExpanded
      });
    }
  }, []);

  const handleCheckVersion = async () => {
    try {
      const response = await fetch('https://qeejuomcapbdlhnjqjcc.functions.supabase.co/miniapp/version');
      const data = await response.json();
      setVersion(data.version || 'Unknown');
    } catch (error) {
      console.error('Failed to fetch version:', error);
      setVersion('Error');
    }
  };

  const handleVerifyInitData = async () => {
    const tg = window.Telegram?.WebApp;
    if (!tg?.initData) {
      alert('No initData available');
      return;
    }

    try {
      const response = await fetch('https://qeejuomcapbdlhnjqjcc.functions.supabase.co/verify-initdata', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ initData: tg.initData })
      });
      
      const result = await response.json();
      alert(`Verification: ${result.valid ? 'Valid' : 'Invalid'}`);
    } catch (error) {
      console.error('Failed to verify initData:', error);
      alert('Verification failed');
    }
  };

  const tabs = [
    { id: "home", label: "Home", icon: Star },
    { id: "plan", label: "Plan", icon: CreditCard },
    { id: "status", label: "Status", icon: CheckCircle },
    { id: "me", label: "Profile", icon: User },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="w-full max-w-md mx-auto">
        {/* Header */}
        <div className="bg-card border-b border-border px-4 py-6">
          <div className="text-center">
            <div className="flex items-center justify-center mb-4">
              <BrandLogo size="lg" showText={false} />
            </div>
            <h1 className="text-xl font-bold text-foreground">Dynamic Capital VIP</h1>
            <p className="text-sm text-muted-foreground">Telegram Mini App</p>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-6">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <TabsTrigger key={tab.id} value={tab.id} className="flex flex-col gap-1 p-3">
                    <Icon className="h-4 w-4" />
                    <span className="text-xs font-medium">{tab.label}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>

            <TabsContent value="home" className="space-y-4">
              <HomeLanding telegramData={telegramData} />
            </TabsContent>

            <TabsContent value="plan" className="space-y-4">
              <PlanSection />
            </TabsContent>

            <TabsContent value="status" className="space-y-4">
              <StatusSection telegramData={telegramData} />
            </TabsContent>

            <TabsContent value="me" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Profile
                </CardTitle>
                <CardDescription>Your Telegram profile information</CardDescription>
              </CardHeader>
              <CardContent>
                {telegramData?.user ? (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Name:</span>
                      <span>{telegramData.user.first_name} {telegramData.user.last_name || ''}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Username:</span>
                      <span>@{telegramData.user.username || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">ID:</span>
                      <span>{telegramData.user.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Language:</span>
                      <span>{telegramData.user.language_code || 'N/A'}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No user data available</p>
                )}
              </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}