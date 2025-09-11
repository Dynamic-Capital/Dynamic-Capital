"use client";

import { useEffect, useState } from 'react';
import WebCheckout from '@/components/checkout/WebCheckout';
import DepositForm from '@/components/deposit-form';
import { supabase } from '@/integrations/supabase/client';
import Link from 'next/link';
import { MotionSection } from '@/components/ui/motion-theme';
import { ThemeToggle } from '@/components/ui/theme-toggle';

export const dynamic = 'force-dynamic';

type BotUser = {
  id: string;
  username: string | null;
  full_name?: string | null;
};

export default function HomePage() {
  const [user, setUser] = useState<BotUser | null>(null);

  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const authUser = session?.user;
      if (authUser) {
        const { data } = await supabase
          .from('bot_users')
          .select('*')
          .eq('id', authUser.id)
          .single();
        if (data) {
          setUser(data as BotUser);
        }
      }
    };
    loadUser();
  }, []);

  useEffect(() => {
    const fetchMessage = async () => {
      try {
        const res = await fetch('/api/hello');
        const data = await res.json();
        setMessage(data.message);
      } catch {
        setError('Error fetching message');
      } finally {
        setIsLoading(false);
      }
    };
    fetchMessage();
  }, []);

  return (
    <>
      <MotionSection className="motion-container min-h-screen bg-gradient-hero p-10 flex flex-col items-center justify-center text-center font-poppins" variant="fadeUp">
        <h1 className="mb-4 typography-4xl font-bold text-dc-brand">
          Dynamic Capital VIP Bot
        </h1>
        <p className="mb-8 typography-xl text-muted-foreground">
          Telegram VIP Bot Management System
        </p>
        <div className="mx-auto max-w-xl rounded-xl bg-card p-8 shadow-elegant">
          <h2 className="mb-4 typography-xl text-foreground">
            Welcome to Dynamic Capital
          </h2>
          <p className="leading-relaxed text-muted-foreground">
            Your premium Telegram bot for VIP services and crypto management.
          </p>
        </div>
      </MotionSection>

      <MotionSection id="dashboard" className="container py-xl text-left" variant="fadeUp">
        <h2 className="text-3xl font-bold mb-lg">
          {user ? `Welcome, ${user.username || user.full_name || 'User'}!` : 'Welcome!'}
        </h2>
        <nav className="flex gap-base">
          <Link href="#deposit" className="motion-button-primary">
            Deposit
          </Link>
          <Link href="#settings" className="motion-button-ghost">
            Settings
          </Link>
        </nav>
      </MotionSection>

      <MotionSection
        id="deposit"
        className="motion-container mb-2xl text-left"
        variant="fadeUp"
      >
        <h2 className="typography-3xl text-dc-brand mb-sm">Deposit</h2>
        <p className="mb-lg text-muted-foreground">
          Add funds to your account.
        </p>
        <DepositForm />
      </MotionSection>

      <MotionSection
        id="checkout"
        className="motion-container mb-2xl text-left"
        variant="slideLeft"
      >
        <h2 className="typography-3xl text-dc-brand mb-sm">Checkout</h2>
        <p className="mb-lg text-muted-foreground">
          Complete your transaction securely.
        </p>
        <WebCheckout />
      </MotionSection>

      <MotionSection
        id="settings"
        className="motion-container mb-2xl text-left"
        variant="scaleIn"
      >
        <h2 className="typography-3xl text-dc-brand mb-sm">Settings</h2>
        <p className="mb-lg text-muted-foreground">
          Customize your preferences.
        </p>
        <ThemeToggle />
      </MotionSection>

      <MotionSection
        id="api-demo"
        className="motion-container mb-2xl text-left"
        variant="fadeUp"
      >
        <h2 className="typography-3xl text-dc-brand mb-sm">API Demo</h2>
        <p className="mb-lg text-muted-foreground">Explore a sample API call.</p>
        {isLoading && <p>Loading...</p>}
        {error && <p>{error}</p>}
        {message && <p>{message}</p>}
      </MotionSection>
    </>
  );
}

