import { type ReactNode } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  LayoutProvider as OnceLayoutProvider,
  ThemeProvider as OnceThemeProvider,
  DataThemeProvider as OnceDataThemeProvider,
  IconProvider as OnceIconProvider,
  ToastProvider as OnceToastProvider,
} from '@once-ui-system/core';
import { MotionConfigProvider } from '@/components/ui/motion-config';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { ChatAssistantWidget } from '@/components/shared/ChatAssistantWidget';
import { OnceLandingPage } from '@/components/once-ui';
import Footer from '@/components/layout/Footer';

const queryClient = new QueryClient();

function OnceUIProviders({ children }: { children: ReactNode }) {
  return (
    <OnceLayoutProvider
      breakpoints={{
        s: 640,
        m: 1024,
        l: 1200,
      }}
    >
      <OnceThemeProvider>
        <OnceDataThemeProvider>
          <OnceToastProvider>
            <OnceIconProvider>
              <MotionConfigProvider>{children}</MotionConfigProvider>
            </OnceIconProvider>
          </OnceToastProvider>
        </OnceDataThemeProvider>
      </OnceThemeProvider>
    </OnceLayoutProvider>
  );
}

function HomePage() {
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

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <OnceUIProviders>
        <Router>
          <div className="min-h-screen flex flex-col">
            <main className="flex-1">
              <Routes>
                <Route path="/" element={<HomePage />} />
              </Routes>
            </main>
            <Footer />
          </div>
          <Toaster />
          <Sonner />
        </Router>
      </OnceUIProviders>
    </QueryClientProvider>
  );
}

export default App;
