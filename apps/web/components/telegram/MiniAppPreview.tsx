import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreditCard, Users, TrendingUp, Star, Smartphone, CheckCircle, Clock, AlertCircle, ExternalLink, Monitor } from "lucide-react";

interface MiniAppPreviewProps {
  className?: string;
}

export default function MiniAppPreview({ className }: MiniAppPreviewProps) {
  const [activeTab, setActiveTab] = useState("home");
  const [viewMode, setViewMode] = useState<"deployed" | "inline">("deployed");

  const miniAppUrl = "https://chatty-telly-bot.lovable.app/miniapp/";

  const tabs = [
    { id: "home", label: "Home", icon: Star },
    { id: "plan", label: "Plan", icon: CreditCard },
    { id: "status", label: "Status", icon: CheckCircle },
    { id: "me", label: "Profile", icon: Users },
  ];

  return (
    <div className={`max-w-sm mx-auto ${className}`}>
      {/* View Mode Selector */}
      <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as "deployed" | "inline")} className="mb-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="deployed" className="flex items-center gap-2">
            <ExternalLink className="h-4 w-4" />
            Deployed
          </TabsTrigger>
          <TabsTrigger value="inline" className="flex items-center gap-2">
            <Monitor className="h-4 w-4" />
            Inline Simple
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Phone Frame */}
      <div className="relative bg-background border-8 border-muted rounded-[2.5rem] shadow-telegram overflow-hidden">
        {/* Status Bar */}
        <div className="bg-telegram text-primary-foreground px-4 py-2 flex items-center justify-between text-xs">
          <span>Telegram</span>
          <div className="flex items-center gap-1">
            <div className="w-4 h-2 bg-primary-foreground/80 rounded-sm"></div>
            <div className="w-1 h-1 bg-primary-foreground rounded-full"></div>
            <span>100%</span>
          </div>
        </div>

        {/* Mini App Header */}
        <div className="bg-gradient-telegram px-4 py-3 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Smartphone className="h-5 w-5 text-primary-foreground" />
            <h2 className="text-lg font-bold text-primary-foreground">Dynamic Capital VIP</h2>
          </div>
          <p className="text-xs text-primary-foreground/80">Mini App Preview</p>
        </div>

        {/* Content Area */}
        <div className="min-h-[400px] bg-gradient-to-br from-muted/20 to-muted/40">
          {viewMode === "deployed" ? (
            <div className="p-4 h-[400px]">
              <iframe
                src={miniAppUrl}
                className="w-full h-full rounded-lg border border-border"
                title="Dynamic Capital Mini App"
              />
            </div>
          ) : (
            <div className="p-4 space-y-4">
              <div className="text-center mb-6">
                <h3 className="text-lg font-bold text-foreground mb-2">Dynamic Capital VIP</h3>
                <p className="text-xs text-muted-foreground">Mini App - Simple View</p>
              </div>
              
              <Card className="bot-card p-3">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 bg-gradient-telegram rounded-full flex items-center justify-center">
                    <Smartphone className="h-4 w-4 text-primary-foreground" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm">Welcome to VIP Bot</h4>
                    <p className="text-xs text-muted-foreground">Interactive testing interface</p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Button size="sm" className="w-full justify-start">
                    <Star className="h-3 w-3 mr-2" />
                    Check Version
                  </Button>
                  <Button size="sm" variant="outline" className="w-full justify-start">
                    <CheckCircle className="h-3 w-3 mr-2" />
                    Verify InitData
                  </Button>
                </div>
              </Card>

              <Card className="bot-card p-3 bg-gradient-telegram/10 border-telegram/30">
                <h4 className="font-semibold text-sm mb-2 text-telegram">Status</h4>
                <div className="text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">WebApp user:</span>
                    <span>@demo_user</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Theme:</span>
                    <span>light</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status:</span>
                    <Badge variant="outline" className="text-xs h-5">Connected</Badge>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>

        {/* Bottom Navigation */}
        <div className="bg-card border-t border-border p-2">
          <div className="flex justify-around">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${
                    activeTab === tab.id
                      ? "bg-telegram text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-xs">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}