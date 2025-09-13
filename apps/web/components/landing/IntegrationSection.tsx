"use client";

import { useState, useEffect } from "react";
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
  HelpCircle,
  ArrowRight,
  Smartphone,
  Globe,
} from "lucide-react";
import { callEdgeFunction } from "@/config/supabase";

interface IntegrationSectionProps {
  onOpenTelegram?: () => void;
  onViewAccount?: () => void;
  onContactSupport?: () => void;
}

const IntegrationSection = ({ onOpenTelegram, onViewAccount, onContactSupport }: IntegrationSectionProps) => {
  const defaultContent = {
    badge: "Platform Integration",
    title: "Seamless Trading Experience",
    description:
      "Connect with our ecosystem of tools and platforms designed for professional traders",
    integrations: [
      {
        title: "Telegram Bot",
        description: "Access premium signals and commands through our official bot",
        icon: Bot,
        link: "@Dynamic_VIP_BOT",
        color: "from-[hsl(var(--telegram))] to-[hsl(var(--telegram-dark))]",
        action: onOpenTelegram,
        primary: true,
      },
      {
        title: "Account Portal",
        description: "Manage your subscription and view payment status",
        icon: User,
        link: "Account Dashboard",
        color: "from-[hsl(var(--dc-secondary))] to-[hsl(var(--accent-teal))]",
        action: onViewAccount,
        primary: false,
      },
      {
        title: "Support Center",
        description: "Get help from our expert trading support team",
        icon: HelpCircle,
        link: "Contact Support",
        color: "from-[hsl(var(--dc-accent))] to-[hsl(var(--accent-pink))]",
        action: onContactSupport,
        primary: false,
      },
    ],
    botTitle: "@Dynamic_VIP_BOT",
    botDescription:
      "Your personal trading assistant with instant access to premium signals, market analysis, and VIP community features. Start receiving professional trading alerts directly in Telegram.",
    botPrimaryButton: "Open Telegram Bot",
    botSecondaryButton: "Copy Bot Link",
    featuresTitle: "Platform Features",
    featuresDescription:
      "Built for professional traders with modern tools and security",
    features: [
      {
        icon: Smartphone,
        title: "Mobile Optimized",
        description: "Access signals on any device, anywhere",
      },
      {
        icon: Shield,
        title: "Secure Platform",
        description: "Your data protected with enterprise security",
      },
      {
        icon: Globe,
        title: "Global Access",
        description: "Available worldwide, 24/7 market coverage",
      },
    ],
  };

  const [content, setContent] = useState(defaultContent);

  useEffect(() => {
    const fetchContent = async () => {
      try {
        const { data, error } = await callEdgeFunction('CONTENT_BATCH', {
          method: 'POST',
          body: {
            keys: [
              'integration_badge',
              'integration_title',
              'integration_description',
              'integration_card1_title',
              'integration_card1_description',
              'integration_card2_title',
              'integration_card2_description',
              'integration_card3_title',
              'integration_card3_description',
              'integration_bot_title',
              'integration_bot_description',
              'integration_bot_primary_button',
              'integration_bot_secondary_button',
              'integration_features_title',
              'integration_features_description',
              'integration_feature1_title',
              'integration_feature1_description',
              'integration_feature2_title',
              'integration_feature2_description',
              'integration_feature3_title',
              'integration_feature3_description',
            ],
          },
        });

        if (!error && data) {
          const items = (data as any).contents || [];
          const lookup: Record<string, string> = {};
          items.forEach((c: any) => {
            lookup[c.content_key] = c.content_value;
          });

          setContent({
            badge: lookup.integration_badge ?? defaultContent.badge,
            title: lookup.integration_title ?? defaultContent.title,
            description: lookup.integration_description ?? defaultContent.description,
            integrations: [
              {
                ...defaultContent.integrations[0],
                title: lookup.integration_card1_title ?? defaultContent.integrations[0].title,
                description: lookup.integration_card1_description ?? defaultContent.integrations[0].description,
              },
              {
                ...defaultContent.integrations[1],
                title: lookup.integration_card2_title ?? defaultContent.integrations[1].title,
                description: lookup.integration_card2_description ?? defaultContent.integrations[1].description,
              },
              {
                ...defaultContent.integrations[2],
                title: lookup.integration_card3_title ?? defaultContent.integrations[2].title,
                description: lookup.integration_card3_description ?? defaultContent.integrations[2].description,
              },
            ],
            botTitle: lookup.integration_bot_title ?? defaultContent.botTitle,
            botDescription: lookup.integration_bot_description ?? defaultContent.botDescription,
            botPrimaryButton: lookup.integration_bot_primary_button ?? defaultContent.botPrimaryButton,
            botSecondaryButton: lookup.integration_bot_secondary_button ?? defaultContent.botSecondaryButton,
            featuresTitle: lookup.integration_features_title ?? defaultContent.featuresTitle,
            featuresDescription: lookup.integration_features_description ?? defaultContent.featuresDescription,
            features: [
              {
                ...defaultContent.features[0],
                title: lookup.integration_feature1_title ?? defaultContent.features[0].title,
                description: lookup.integration_feature1_description ?? defaultContent.features[0].description,
              },
              {
                ...defaultContent.features[1],
                title: lookup.integration_feature2_title ?? defaultContent.features[1].title,
                description: lookup.integration_feature2_description ?? defaultContent.features[1].description,
              },
              {
                ...defaultContent.features[2],
                title: lookup.integration_feature3_title ?? defaultContent.features[2].title,
                description: lookup.integration_feature3_description ?? defaultContent.features[2].description,
              },
            ],
          });
        } else if (error) {
          console.error('Failed to fetch integration content:', error.message);
        }
      } catch (err) {
        console.error('Failed to fetch integration content:', err);
      }
    };

    fetchContent();
  }, [onOpenTelegram, onViewAccount, onContactSupport]);

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
              {content.badge}
            </Badge>
            <h2 className="text-3xl md:text-5xl font-bold mb-6 font-poppins text-foreground">
              {content.title}
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto font-inter leading-relaxed">
              {content.description}
            </p>
          </div>
        </MotionScrollReveal>

        {/* Main Integration Cards */}
        <MotionStagger staggerDelay={0.2} className="grid md:grid-cols-3 gap-8 mb-16">
          {content.integrations.map((integration, index) => (
            <MotionHoverCard key={integration.title} hoverScale={integration.primary ? 1.08 : 1.05} hoverY={-12}>
              <Card
                className={`relative overflow-hidden ${integration.primary ? 'ring-2 ring-telegram scale-105' : ''} hover:shadow-2xl transition-all duration-500 cursor-pointer`}
                onClick={integration.action}
              >
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
                    {integration.primary ? content.botPrimaryButton : 'Access'}
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
                  {content.botTitle}
                </h3>
                <p className="text-lg text-muted-foreground mb-6 font-inter max-w-2xl mx-auto">
                  {content.botDescription}
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button
                    size="lg"
                    className="bg-telegram hover:bg-telegram/90 text-white font-semibold"
                    onClick={onOpenTelegram}
                  >
                    <MessageCircle className="w-5 h-5 mr-2" />
                    {content.botPrimaryButton}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-telegram text-telegram hover:bg-telegram/10"
                    onClick={() => window.open('https://t.me/Dynamic_VIP_BOT', '_blank')}
                  >
                    {content.botSecondaryButton}
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
              {content.featuresTitle}
            </h3>
            <p className="text-lg text-muted-foreground font-inter">
              {content.featuresDescription}
            </p>
          </div>
        </MotionScrollReveal>

        <MotionStagger staggerDelay={0.3} className="grid md:grid-cols-3 gap-8">
          {content.features.map((feature, index) => (
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
