import React from 'react';
import HeroSection from '../apps/web/components/landing/HeroSection';
import FeatureGrid from '../apps/web/components/landing/FeatureGrid';
import ServicesSection from '../apps/web/components/landing/ServicesSection';
import TestimonialsSection from '../apps/web/components/landing/TestimonialsSection';
import IntegrationSection from '../apps/web/components/landing/IntegrationSection';
import CTASection from '../apps/web/components/landing/CTASection';

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
    <div className="min-h-screen bg-background">
      <HeroSection onJoinVIP={handleJoinVIP} onLearnMore={handleLearnMore} />
      
      <div id="features">
        <FeatureGrid />
      </div>
      
      <ServicesSection 
        onSelectPlan={handleSelectPlan}
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
    </div>
  );
}

export default App;