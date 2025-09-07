import { useState } from "react";
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Smartphone,
  Bot,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Copy,
  Zap
} from "lucide-react";
import { MotionCard, MotionCardContainer } from "@/components/ui/motion-card";

export default function TelegramSetup() {
  const [loading, setLoading] = useState(false);
  const [setupResult, setSetupResult] = useState<any>(null);
  const [miniAppUrl, setMiniAppUrl] = useState("");
  const { toast } = useToast();

  const setupMiniApp = async () => {
    if (!miniAppUrl.trim()) {
      toast({
        title: "Missing URL",
        description: "Please enter your Lovable app URL",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('setup-miniapp', {
        body: { miniAppUrl: miniAppUrl.trim() }
      });

      if (error) throw error;

      setSetupResult(data);
      
      if (data.success) {
        toast({
          title: "✅ Mini App Setup Complete!",
          description: "Your Telegram bot is now configured as a Mini App"
        });
      } else {
        toast({
          title: "Setup Failed",
          description: data.error || "Unknown error occurred",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error('Setup error:', error);
      toast({
        title: "Setup Failed",
        description: error.message || "Failed to setup Mini App",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "URL copied to clipboard"
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Bot className="h-8 w-8 text-telegram" />
            <Smartphone className="h-8 w-8 text-telegram" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-telegram bg-clip-text text-transparent mb-2">
            Telegram Mini App Setup
          </h1>
          <p className="text-lg text-muted-foreground">
            Configure your bot to launch your Lovable app as a Mini App
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Setup Form */}
          <MotionCard className="bot-card">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-telegram" />
                <CardTitle>Quick Setup</CardTitle>
              </div>
              <CardDescription>
                Connect your published Lovable app to Telegram
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="miniapp-url">Lovable App URL</Label>
                <div className="flex gap-2">
                  <Input
                    id="miniapp-url"
                    placeholder="https://yourapp.lovable.app"
                    value={miniAppUrl}
                    onChange={(e) => setMiniAppUrl(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(miniAppUrl)}
                    disabled={!miniAppUrl}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Get this URL from your Lovable app's publish page
                </p>
              </div>

              <Button 
                onClick={setupMiniApp} 
                disabled={loading || !miniAppUrl.trim()}
                className="w-full bg-telegram hover:bg-telegram/90"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin mr-2" />
                    Setting up Mini App...
                  </>
                ) : (
                  <>
                    <Smartphone className="h-4 w-4 mr-2" />
                    Setup Mini App
                  </>
                )}
              </Button>

              {setupResult && (
                <Alert className={setupResult.success ? "border-telegram" : "border-destructive"}>
                  <div className="flex items-center gap-2">
                    {setupResult.success ? (
                      <CheckCircle className="h-4 w-4 text-telegram" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-destructive" />
                    )}
                    <AlertDescription>
                      {setupResult.success 
                        ? "Mini App configured successfully!" 
                        : `Setup failed: ${setupResult.error}`
                      }
                    </AlertDescription>
                  </div>
                </Alert>
              )}
            </CardContent>
          </MotionCard>

          {/* Instructions */}
          <div className="space-y-6">
            <MotionCard className="bot-card">
              <CardHeader>
                <CardTitle className="text-telegram">Setup Instructions</CardTitle>
                <CardDescription>Follow these steps to complete integration</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-telegram rounded-full flex items-center justify-center text-xs text-primary-foreground font-bold">
                      1
                    </div>
                    <div>
                      <h4 className="font-semibold">Publish Your App</h4>
                      <p className="text-sm text-muted-foreground">
                        Click "Publish" in Lovable and copy the URL
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-telegram rounded-full flex items-center justify-center text-xs text-primary-foreground font-bold">
                      2
                    </div>
                    <div>
                      <h4 className="font-semibold">Enter URL Above</h4>
                      <p className="text-sm text-muted-foreground">
                        Paste your Lovable app URL and click "Setup Mini App"
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-telegram rounded-full flex items-center justify-center text-xs text-primary-foreground font-bold">
                      3
                    </div>
                    <div>
                      <h4 className="font-semibold">Test in Telegram</h4>
                      <p className="text-sm text-muted-foreground">
                        Open your bot in Telegram and tap the menu button
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </MotionCard>

            {setupResult?.success && (
              <MotionCard className="bot-card bg-telegram/5 border-telegram/30">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-telegram">🎉 Ready to Test!</CardTitle>
                    <Badge className="bg-telegram text-primary-foreground">Active</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">Bot:</span>
                      <p className="font-semibold">@{setupResult.botInfo?.username}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Menu Button:</span>
                      <p className="font-semibold">{setupResult.menuButtonSet ? "✅ Set" : "❌ Failed"}</p>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    className="w-full border-telegram text-telegram hover:bg-telegram/10"
                    onClick={() => window.open(`https://t.me/${setupResult.botInfo?.username}`, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Test in Telegram
                  </Button>
                </CardContent>
              </MotionCard>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
