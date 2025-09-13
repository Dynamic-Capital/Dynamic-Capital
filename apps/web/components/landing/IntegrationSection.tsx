"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MotionStagger, MotionScrollReveal, MotionHoverCard } from "@/components/ui/motion-components";
import { 
  MessageCircle, 
  User, 
  Shield, 
  ExternalLink,
  Bot,
  Settings,
  HelpCircle,
  ArrowRight,
  Smartphone,
  Globe
} from "lucide-react";

interface IntegrationSectionProps {
  onOpenTelegram?: () => void;
  onViewAccount?: () => void;
  onContactSupport?: () => void;
}

const IntegrationSection = ({ onOpenTelegram, onViewAccount, onContactSupport }: IntegrationSectionProps) => {
  const integrations = [
    {
      title: "Telegram Bot",
      description: "Access premium signals and commands through our official bot",
      icon: Bot,
      link: "@Dynamic_VIP_BOT",
      color: "from-[hsl(var(--telegram))] to-[hsl(var(--telegram-dark))]",
      action: onOpenTelegram,
      primary: true
    },
    {
      title: "Account Portal",
      description: "Manage your subscription and view payment status",
      icon: User,
      link: "Account Dashboard",
      color: "from-[hsl(var(--dc-secondary))] to-[hsl(var(--accent-teal))]",
      action: onViewAccount,
      primary: false
    },
    {
      title: "Support Center",
      description: "Get help from our expert trading support team",
      icon: HelpCircle,
      link: "Contact Support",
      color: "from-[hsl(var(--dc-accent))] to-[hsl(var(--accent-pink))]",
      action: onContactSupport,
      primary: false
    }
  ];

  const features = [
    {
      icon: Smartphone,
      title: "Mobile Optimized",
      description: "Access signals on any device, anywhere"
    },
    {
      icon: Shield,
      title: "Secure Platform",
      description: "Your data protected with enterprise security"
    },
    {
      icon: Globe,
      title: "Global Access",
      description: "Available worldwide, 24/7 market coverage"
    }
  ];

  return (
    <section className="py-20 bg-gradient-to-b from-background via-muted/10 to-background relative">
      {/* Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-20 right-20 w-72 h-72 bg-gradient-to-r from-[hsl(var(--telegram)/0.1)] to-[hsl(var(--dc-accent)/0.1)] rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 left-20 w-80 h-80 bg-gradient-to-r from-[hsl(var(--primary)/0.1)] to-[hsl(var(--dc-secondary)/0.1)] rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <div className="container mx-auto px-6 relative">
        <MotionScrollReveal>
          <div className="text-center mb-16">
            <Badge className="mb-6 bg-[hsl(var(--telegram)/0.1)] text-[hsl(var(--telegram))] border-[hsl(var(--telegram)/0.3)] text-lg px-6 py-2">
              <MessageCircle className="w-5 h-5 mr-2" />
              Platform Integration
            </Badge>
            <h2 className="text-3xl md:text-5xl font-bold mb-6 font-poppins text-foreground">
              Seamless Trading Experience
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto font-inter leading-relaxed">
              Connect with our ecosystem of tools and platforms designed for professional traders
            </p>
          </div>
        </MotionScrollReveal>

        {/* Main Integration Cards */}
        <MotionStagger staggerDelay={0.2} className="grid md:grid-cols-3 gap-8 mb-16">
          {integrations.map((integration, index) => (
            <MotionHoverCard key={integration.title} hoverScale={integration.primary ? 1.08 : 1.05} hoverY={-12}>
              <Card className={`relative overflow-hidden ${integration.primary ? 'ring-2 ring-telegram scale-105' : ''} hover:shadow-2xl transition-all duration-500 cursor-pointer`} onClick={integration.action}>
                {integration.primary && (
                  <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-telegram to-telegram-dark text-white text-center py-2 text-sm font-bold">
                    MAIN PLATFORM
                  </div>
                )}
                
                <CardHeader className={`text-center ${integration.primary ? 'pt-12' : 'pt-8'}`}>
                  <div className={`w-16 h-16 mx-auto mb-4 bg-gradient-to-br ${integration.color} rounded-full flex items-center justify-center transform group-hover:scale-110 transition-transform duration-300`}>
                    <integration.icon className="w-8 h-8 text-white" />
                  </div>
                  <CardTitle className="text-xl font-bold font-poppins">{integration.title}</CardTitle>
                  <p className="text-muted-foreground font-inter text-sm">{integration.description}</p>
                </CardHeader>
                
                <CardContent className="text-center">
                  <div className="mb-4">
                    <span className="text-sm font-medium text-primary">{integration.link}</span>
                  </div>
                  
                  <Button 
                    className={`w-full ${integration.primary ? 'bg-telegram hover:bg-telegram/90' : 'bg-muted hover:bg-muted/80'} font-semibold`}
                    onClick={integration.action}
                  >
                    {integration.primary ? 'Open Bot' : 'Access'}
                    <ExternalLink className="w-4 h-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            </MotionHoverCard>
          ))}
        </MotionStagger>

        {/* Telegram Bot Feature Highlight */}
        <MotionScrollReveal>
          <Card className="bg-gradient-to-r from-telegram/10 via-background to-telegram/10 border-telegram/20 mb-16">
            <CardContent className="p-8 text-center">
              <div className="max-w-4xl mx-auto">
                <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-telegram to-telegram-dark rounded-full flex items-center justify-center">
                  <Bot className="w-10 h-10 text-white" />
                </div>
                
                <h3 className="text-2xl md:text-3xl font-bold mb-4 font-poppins">
                  @Dynamic_VIP_BOT
                </h3>
                <p className="text-lg text-muted-foreground mb-6 font-inter max-w-2xl mx-auto">
                  Your personal trading assistant with instant access to premium signals, market analysis, and VIP community features. Start receiving professional trading alerts directly in Telegram.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button 
                    size="lg" 
                    className="bg-telegram hover:bg-telegram/90 text-white font-semibold"
                    onClick={onOpenTelegram}
                  >
                    <MessageCircle className="w-5 h-5 mr-2" />
                    Open Telegram Bot
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                  <Button 
                    size="lg" 
                    variant="outline" 
                    className="border-telegram text-telegram hover:bg-telegram/10"
                    onClick={() => window.open('https://t.me/Dynamic_VIP_BOT', '_blank')}
                  >
                    Copy Bot Link
                    <ExternalLink className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </MotionScrollReveal>

        {/* Platform Features */}
        <MotionScrollReveal>
          <div className="text-center mb-12">
            <h3 className="text-2xl md:text-3xl font-bold mb-4 font-poppins text-foreground">
              Platform Features
            </h3>
            <p className="text-lg text-muted-foreground font-inter">
              Built for professional traders with modern tools and security
            </p>
          </div>
        </MotionScrollReveal>

        <MotionStagger staggerDelay={0.3} className="grid md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <MotionHoverCard key={feature.title} hoverScale={1.05} hoverY={-8}>
              <Card className="bot-card group hover:shadow-xl transition-all duration-300 text-center">
                <CardContent className="p-6">
                  <div className="w-12 h-12 mx-auto mb-4 bg-gradient-to-br from-primary to-[hsl(var(--dc-accent))] rounded-full flex items-center justify-center transform group-hover:scale-110 transition-transform duration-300">
                    <feature.icon className="w-6 h-6 text-white" />
                  </div>
                  <h4 className="text-lg font-semibold mb-3 group-hover:text-primary transition-colors font-poppins">
                    {feature.title}
                  </h4>
                  <p className="text-muted-foreground font-inter text-sm">{feature.description}</p>
                </CardContent>
              </Card>
            </MotionHoverCard>
          ))}
        </MotionStagger>
      </div>
    </section>
  );
};

export default IntegrationSection;