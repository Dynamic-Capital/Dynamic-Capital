import { ChatAssistantWidget } from '@/components/shared/ChatAssistantWidget';
import { OnceLandingPage } from '@/components/once-ui';

export const dynamic = 'force-dynamic';

export default function HomePage() {
  const handleJoinVIP = () => {
    window.open('https://t.me/Dynamic_VIP_BOT', '_blank');
  };

  const handleLearnMore = () => {
    // Smooth scroll to features section
    const featuresSection = document.getElementById('features');
    featuresSection?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleOpenTelegram = () => {
    window.open('https://t.me/Dynamic_VIP_BOT', '_blank');
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
    <div className="min-h-screen space-y-16 bg-gradient-to-br from-background via-card/10 to-background pb-24">
      <OnceLandingPage
        onJoinVIP={handleJoinVIP}
        onLearnMore={handleLearnMore}
        onOpenTelegram={handleOpenTelegram}
        onPlanSelect={handleSelectPlan}
        onBankPayment={handleBankPayment}
        onCryptoPayment={handleCryptoPayment}
        onContactSupport={handleContactSupport}
      />

      <ChatAssistantWidget />
    </div>
  );
}
