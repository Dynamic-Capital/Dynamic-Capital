import React from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import HeroSection from '@/components/landing/HeroSection';
import FeatureGrid from '@/components/landing/FeatureGrid';
import VipPriceSwitcher from '@/components/landing/VipPriceSwitcher';
import { LivePlansSection } from '@/components/shared/LivePlansSection';
import TestimonialsSection from '@/components/landing/TestimonialsSection';
import IntegrationSection from '@/components/landing/IntegrationSection';
import CTASection from '@/components/landing/CTASection';
import { ChatAssistantWidget } from '@/components/shared/ChatAssistantWidget';

function App() {
  const handleJoinVIP = () => {
    window.open('https://t.me/Dynamic_VIP_BOT', '_blank');
  };

  const handleLearnMore = () => {
    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleOpenTelegram = () => {
    window.open('https://t.me/Dynamic_VIP_BOT', '_blank');
  };

  const handleViewAccount = () => {
    // Navigate to account page when implemented
    console.log('Navigate to account page');
  };

  const handleContactSupport = () => {
    window.open('https://t.me/Dynamic_VIP_BOT', '_blank');
  };

  const handleSelectPlan = (planId: string) => {
    console.log('Selected plan:', planId);
    window.open('https://t.me/Dynamic_VIP_BOT', '_blank');
  };

  const handleBankPayment = () => {
    window.open('https://t.me/Dynamic_VIP_BOT', '_blank');
  };

  const handleCryptoPayment = () => {
    window.open('https://t.me/Dynamic_VIP_BOT', '_blank');
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-brand">
      <Header />
      <main className="flex-1">
        <HeroSection onJoinVIP={handleJoinVIP} onLearnMore={handleLearnMore} />

        <VipPriceSwitcher />

        <div id="features">
          <FeatureGrid />
        </div>

        <LivePlansSection
          showPromo
          onPlanSelect={handleSelectPlan}
          onBankPayment={handleBankPayment}
          onCryptoPayment={handleCryptoPayment}
        />

        <TestimonialsSection />

        <IntegrationSection
          onOpenTelegram={handleOpenTelegram}
          onViewAccount={handleViewAccount}
          onContactSupport={handleContactSupport}
        />

        <CTASection
          onJoinNow={handleJoinVIP}
          onOpenTelegram={handleOpenTelegram}
        />
      </main>
      <Footer />
      <ChatAssistantWidget />
    </div>
  );
}

export default App;