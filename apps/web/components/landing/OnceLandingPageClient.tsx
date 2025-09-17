'use client';

import { useCallback } from 'react';

import { OnceLandingPage } from '@/components/once-ui';

const TELEGRAM_VIP_URL = 'https://t.me/Dynamic_VIP_BOT';

export function OnceLandingPageClient() {
  const openInNewTab = useCallback((url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  }, []);

  const handleJoinVIP = useCallback(() => {
    openInNewTab(TELEGRAM_VIP_URL);
  }, [openInNewTab]);

  const handleOpenTelegram = useCallback(() => {
    openInNewTab(TELEGRAM_VIP_URL);
  }, [openInNewTab]);

  const handleContactSupport = useCallback(() => {
    openInNewTab(TELEGRAM_VIP_URL);
  }, [openInNewTab]);

  const handlePlanSelect = useCallback(
    (planId: string) => {
      console.log('Selected plan:', planId);
      openInNewTab(TELEGRAM_VIP_URL);
    },
    [openInNewTab]
  );

  const handleBankPayment = useCallback(() => {
    openInNewTab(TELEGRAM_VIP_URL);
  }, [openInNewTab]);

  const handleCryptoPayment = useCallback(() => {
    openInNewTab(TELEGRAM_VIP_URL);
  }, [openInNewTab]);

  const handleLearnMore = useCallback(() => {
    const featuresSection = document.getElementById('features');
    featuresSection?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  return (
    <OnceLandingPage
      onJoinVIP={handleJoinVIP}
      onLearnMore={handleLearnMore}
      onOpenTelegram={handleOpenTelegram}
      onPlanSelect={handlePlanSelect}
      onBankPayment={handleBankPayment}
      onCryptoPayment={handleCryptoPayment}
      onContactSupport={handleContactSupport}
    />
  );
}
