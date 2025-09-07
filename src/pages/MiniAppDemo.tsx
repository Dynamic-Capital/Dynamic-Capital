import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import MiniAppPreview from "@/components/telegram/MiniAppPreview";
import { ExternalLink, Smartphone, Code, Zap } from "lucide-react";
import { MotionCard, MotionCardContainer } from "@/components/ui/motion-card";

export default function MiniAppDemo() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background font-inter">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Smartphone className="h-8 w-8 text-telegram" />
            <h1 className="text-4xl font-bold bg-gradient-telegram bg-clip-text text-transparent">
              Telegram Mini App
            </h1>
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Experience our VIP bot through an interactive Telegram Mini App. Seamless payments, real-time status, and premium features.
          </p>
          <div className="flex items-center justify-center gap-2 mt-4">
            <Badge className="bg-telegram text-primary-foreground">Live Demo</Badge>
            <Badge variant="outline">Interactive Preview</Badge>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 items-start">
          {/* Mini App Preview */}
          <div className="flex justify-center">
            <MiniAppPreview className="animate-fade-in" />
          </div>

          {/* Features & Info */}
          <MotionCardContainer className="space-y-6 animate-slide-up">
            <MotionCard className="bot-card">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-telegram" />
                  <CardTitle>Key Features</CardTitle>
                </div>
                <CardDescription>
                  Everything you need for VIP trading access
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-telegram rounded-full mt-2"></div>
                    <div>
                      <h4 className="font-semibold">Instant Plan Selection</h4>
                      <p className="text-sm text-muted-foreground">Choose and upgrade your VIP subscription directly in Telegram</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-telegram rounded-full mt-2"></div>
                    <div>
                      <h4 className="font-semibold">Multi-Payment Options</h4>
                      <p className="text-sm text-muted-foreground">Support for bank transfers and cryptocurrency payments</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-telegram rounded-full mt-2"></div>
                    <div>
                      <h4 className="font-semibold">Real-time Status</h4>
                      <p className="text-sm text-muted-foreground">Track payments and subscription status instantly</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-telegram rounded-full mt-2"></div>
                    <div>
                      <h4 className="font-semibold">Seamless Integration</h4>
                      <p className="text-sm text-muted-foreground">Native Telegram experience with no app downloads</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </MotionCard>

            <MotionCard className="bot-card">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Code className="h-5 w-5 text-telegram" />
                  <CardTitle>Technical Stack</CardTitle>
                </div>
                <CardDescription>
                  Built with modern web technologies
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-muted/30 rounded-lg">
                    <div className="font-semibold text-sm">Frontend</div>
                    <div className="text-xs text-muted-foreground mt-1">React + TypeScript</div>
                  </div>
                  <div className="text-center p-3 bg-muted/30 rounded-lg">
                    <div className="font-semibold text-sm">Backend</div>
                    <div className="text-xs text-muted-foreground mt-1">Supabase Edge</div>
                  </div>
                  <div className="text-center p-3 bg-muted/30 rounded-lg">
                    <div className="font-semibold text-sm">Payments</div>
                    <div className="text-xs text-muted-foreground mt-1">Multi-provider</div>
                  </div>
                  <div className="text-center p-3 bg-muted/30 rounded-lg">
                    <div className="font-semibold text-sm">Security</div>
                    <div className="text-xs text-muted-foreground mt-1">End-to-end</div>
                  </div>
                </div>
              </CardContent>
            </MotionCard>

            <MotionCard className="bot-card bg-gradient-telegram/5 border-telegram/30">
              <CardHeader className="text-center">
                <CardTitle className="text-telegram">Ready to Experience?</CardTitle>
                <CardDescription>
                  Try the mini app and test promo codes
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center space-y-4">
                <Button className="bg-telegram hover:bg-telegram/90 text-primary-foreground w-full">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open in Telegram
                </Button>
                <Button variant="outline" className="w-full" onClick={() => window.location.href = '/checkout'}>
                  Test Promo Codes
                </Button>
                <p className="text-xs text-muted-foreground">
                  Try: TEST10, SAVE20, WELCOME10, LIFETIME50
                </p>
              </CardContent>
            </MotionCard>
          </MotionCardContainer>
        </div>

        {/* Additional Info */}
        <div className="mt-16 text-center">
          <MotionCard className="bot-card max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle>How It Works</CardTitle>
              <CardDescription>
                Simple steps to access your VIP trading benefits
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="w-12 h-12 bg-telegram rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-primary-foreground font-bold">1</span>
                  </div>
                  <h4 className="font-semibold mb-1">Open Mini App</h4>
                  <p className="text-sm text-muted-foreground">Launch directly from Telegram chat</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-telegram rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-primary-foreground font-bold">2</span>
                  </div>
                  <h4 className="font-semibold mb-1">Choose & Pay</h4>
                  <p className="text-sm text-muted-foreground">Select plan and complete payment</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-telegram rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-primary-foreground font-bold">3</span>
                  </div>
                  <h4 className="font-semibold mb-1">Access VIP</h4>
                  <p className="text-sm text-muted-foreground">Instant access to premium features</p>
                </div>
              </div>
              </CardContent>
            </MotionCard>
        </div>
      </div>
    </div>
  );
}
