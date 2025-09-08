"use client";

import { Separator } from "@/components/ui/separator";
import { FullscreenAdaptive } from "@/components/ui/responsive-motion";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import HeroSection from "@/components/landing/HeroSection";
import TestimonialsSection from "@/components/landing/TestimonialsSection";
import FeatureGrid from "@/components/landing/FeatureGrid";
import CTASection from "@/components/landing/CTASection";
import ServicesSection from "@/components/landing/ServicesSection";
import PlansSection from "@/components/landing/PlansSection";
import HowItWorksSection from "@/components/landing/HowItWorksSection";
import MiniAppSection from "@/components/landing/MiniAppSection";
import { useRouter } from "next/navigation";
import { TELEGRAM_BOT_USERNAME } from "@/config";

const Landing = () => {
  const router = useRouter();
  const handleOpenTelegram = () => {
    const telegramUrl = `https://t.me/${TELEGRAM_BOT_USERNAME}`;
    window.open(telegramUrl, '_blank');
  };

  const handleJoinNow = () => {
    const isInTelegram = Boolean(
      window.Telegram?.WebApp?.initData ||
      window.Telegram?.WebApp?.initDataUnsafe ||
      window.location.search.includes('tgWebAppPlatform') ||
      navigator.userAgent.includes('TelegramWebApp')
    );

    if (isInTelegram) {
      router.push('/miniapp?tab=plan');
    } else {
      router.push('/plans');
    }
  };

  return (
    <FullscreenAdaptive className="min-h-screen bg-background font-inter text-foreground">
      <ThemeToggle />
      <HeroSection onOpenTelegram={handleOpenTelegram} />
      <Separator className="my-16 bg-[hsl(var(--accent-light)/0.2)]" />
      <TestimonialsSection />
      <Separator className="my-16" />
      <ServicesSection />
      <Separator className="my-16" />
      <FeatureGrid />
      <PlansSection />
      <HowItWorksSection />
      <MiniAppSection onOpenTelegram={handleOpenTelegram} />
      <CTASection onJoinNow={handleJoinNow} onOpenTelegram={handleOpenTelegram} />
    </FullscreenAdaptive>
  );
};

export default Landing;
