import { Sparkles, Shield, Zap, Users, TrendingUp, CheckCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import MiniAppPreview from "@/components/telegram/MiniAppPreview";

const Landing = () => {
  const handleOpenTelegram = () => {
    // Use the actual Dynamic Capital VIP Bot
    const botUsername = "Dynamic_VIP_BOT";
    const telegramUrl = `https://t.me/${botUsername}`;
    window.open(telegramUrl, '_blank');
  };

  const handleOpenMiniApp = () => {
    // Open mini app directly
    window.location.href = '/miniapp';
  };

  const handleJoinNow = () => {
    // Check if in Telegram, otherwise go to plans page
    const isInTelegram = Boolean(
      window.Telegram?.WebApp?.initData || 
      window.Telegram?.WebApp?.initDataUnsafe ||
      window.location.search.includes('tgWebAppPlatform') ||
      navigator.userAgent.includes('TelegramWebApp')
    );
    
    if (isInTelegram) {
      window.location.href = '/miniapp?tab=plan';
    } else {
      window.location.href = '/plans';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-telegram">
        <div className="absolute inset-0 bg-black/10" />
        <div className="relative container mx-auto px-6 py-20 text-center">
          <div className="mx-auto max-w-4xl">
            <Badge className="mb-6 bg-white/20 text-white border-white/30 hover:bg-white/30">
              <Sparkles className="w-4 h-4 mr-2" />
              Premium Trading Platform
            </Badge>
            
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 animate-fade-in">
              Unlock <span className="bg-gradient-to-r from-yellow-300 to-orange-400 bg-clip-text text-transparent">VIP Trading</span> Signals
            </h1>
            
            <p className="text-xl md:text-2xl text-white/90 mb-8 max-w-3xl mx-auto animate-slide-up">
              Join Dynamic Capital's exclusive community and get access to premium trading signals, 
              expert analysis, and profitable strategies that deliver results.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12 animate-scale-in">
              <Button 
                size="lg" 
                className="bg-white text-telegram hover:bg-white/90 shadow-lg"
                onClick={handleJoinNow}
              >
                <Users className="w-5 h-5 mr-2" />
                Join VIP Community
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="border-white/30 text-white hover:bg-white/10"
                onClick={handleOpenTelegram}
              >
                Open @Dynamic_VIP_BOT
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="border-white/30 text-white hover:bg-white/10"
                onClick={handleOpenMiniApp}
              >
                <Zap className="w-5 h-5 mr-2" />
                Open Mini App
              </Button>
            </div>

            {/* Trust Indicators */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-white/80">
              <div className="text-center">
                <div className="text-2xl md:text-3xl font-bold">1000+</div>
                <div className="text-sm">Active Members</div>
              </div>
              <div className="text-center">
                <div className="text-2xl md:text-3xl font-bold">85%</div>
                <div className="text-sm">Success Rate</div>
              </div>
              <div className="text-center">
                <div className="text-2xl md:text-3xl font-bold">24/7</div>
                <div className="text-sm">Support</div>
              </div>
              <div className="text-center">
                <div className="text-2xl md:text-3xl font-bold">5★</div>
                <div className="text-sm">Rating</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Why Choose Dynamic Capital VIP?</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Get exclusive access to premium features designed for serious traders
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="bot-card group">
              <CardContent className="p-8 text-center">
                <div className="bot-icon-wrapper w-16 h-16 mx-auto mb-6 bg-gradient-telegram">
                  <TrendingUp className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-4">Premium Signals</h3>
                <p className="text-muted-foreground">
                  Receive high-accuracy trading signals with detailed entry, exit, and stop-loss levels
                </p>
              </CardContent>
            </Card>

            <Card className="bot-card group">
              <CardContent className="p-8 text-center">
                <div className="bot-icon-wrapper w-16 h-16 mx-auto mb-6 bg-gradient-telegram">
                  <Shield className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-4">Risk Management</h3>
                <p className="text-muted-foreground">
                  Professional risk management strategies to protect your capital and maximize profits
                </p>
              </CardContent>
            </Card>

            <Card className="bot-card group">
              <CardContent className="p-8 text-center">
                <div className="bot-icon-wrapper w-16 h-16 mx-auto mb-6 bg-gradient-telegram">
                  <Users className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-4">VIP Community</h3>
                <p className="text-muted-foreground">
                  Join an exclusive community of successful traders and learn from the best
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-xl text-muted-foreground">
              Get started in just 3 simple steps
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "1",
                title: "Choose Your Plan",
                description: "Select a VIP subscription plan that fits your trading style and budget"
              },
              {
                step: "2", 
                title: "Complete Payment",
                description: "Pay securely via bank transfer or cryptocurrency and get instant access"
              },
              {
                step: "3",
                title: "Start Trading",
                description: "Receive premium signals and join our exclusive VIP community"
              }
            ].map((item, index) => (
              <div key={index} className="text-center">
                <div className="w-16 h-16 mx-auto mb-6 bg-gradient-telegram rounded-full flex items-center justify-center">
                  <span className="text-2xl font-bold text-white">{item.step}</span>
                </div>
                <h3 className="text-xl font-semibold mb-4">{item.title}</h3>
                <p className="text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mini App Preview */}
      <section id="preview-section" className="py-20 bg-muted/30">
        <div className="container mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge className="mb-4 bg-telegram/10 text-telegram border-telegram/20">
                <Zap className="w-4 h-4 mr-2" />
                Live Demo
              </Badge>
              
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                Experience Our Telegram Mini App
              </h2>
              
              <p className="text-xl text-muted-foreground mb-8">
                See how easy it is to access premium trading signals and manage your VIP subscription 
                directly within Telegram.
              </p>

              <div className="space-y-4 mb-8">
                {[
                  "Instant access to trading signals",
                  "Real-time payment processing", 
                  "Seamless Telegram integration",
                  "Mobile-optimized interface"
                ].map((feature, index) => (
                  <div key={index} className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-telegram mr-3" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>

              <Button 
                size="lg" 
                className="bg-telegram hover:bg-telegram-dark"
                onClick={handleOpenTelegram}
              >
                Try It Now in Telegram
              </Button>
            </div>

            <div className="lg:order-first">
              <MiniAppPreview className="mx-auto" />
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-telegram">
        <div className="container mx-auto px-6 text-center">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              Ready to Start Your VIP Trading Journey?
            </h2>
            <p className="text-xl text-white/90 mb-8">
              Join thousands of successful traders who trust Dynamic Capital for premium signals and strategies.
            </p>
            <Button 
              size="lg" 
              className="bg-white text-telegram hover:bg-white/90 shadow-lg"
              onClick={handleJoinNow}
            >
              <Sparkles className="w-5 h-5 mr-2" />
              Get VIP Access Now
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Landing;