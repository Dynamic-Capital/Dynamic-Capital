"use client";

import { useEffect, useState, FormEvent, ChangeEvent } from 'react';
import WebCheckout from '@/components/checkout/WebCheckout';
import DepositForm from '@/components/deposit-form';
import { supabase } from '@/integrations/supabase/client';
import Link from 'next/link';

type BotUser = {
  id: string;
  username: string | null;
  full_name?: string | null;
};

const themes = ['light', 'dark', 'glass'] as const;
type Theme = (typeof themes)[number];

export default function HomePage() {
  const [user, setUser] = useState<BotUser | null>(null);
  const [theme, setTheme] = useState<Theme>('light');
  const [status, setStatus] = useState<string | null>(null);

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
    const loadTheme = async () => {
      try {
        const res = await fetch('/functions/v1/theme-save');
        if (res.ok) {
          const data = await res.json();
          if (data.theme) {
            setTheme(data.theme as Theme);
            applyTheme(data.theme);
          }
        }
      } catch (e) {
        console.error(e);
      }
    };
    loadTheme();
  }, []);

  const applyTheme = (t: Theme) => {
    document.documentElement.className = t;
  };

  const handleThemeChange = (e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value as Theme;
    setTheme(val);
    applyTheme(val);
  };

  const handleThemeSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/functions/v1/theme-save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ theme }),
      });
      if (!res.ok) {
        throw new Error(await res.text());
      }
      setStatus('Preference saved.');
    } catch (err: any) {
      setStatus(`Error: ${err.message}`);
    }
  };

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
      <section className="motion-container motion-section min-h-screen bg-gradient-hero p-10 flex flex-col items-center justify-center text-center font-poppins">
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
      </section>

      <section id="dashboard" className="container py-xl text-left">
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
      </section>

      <section
        id="deposit"
        className="motion-section motion-container mb-2xl text-left"
      >
        <h2 className="typography-3xl text-dc-brand mb-sm">Deposit</h2>
        <p className="mb-lg text-muted-foreground">
          Add funds to your account.
        </p>
        <DepositForm />
      </section>

      <section
        id="checkout"
        className="motion-section motion-container mb-2xl text-left"
      >
        <h2 className="typography-3xl text-dc-brand mb-sm">Checkout</h2>
        <p className="mb-lg text-muted-foreground">
          Complete your transaction securely.
        </p>
        <WebCheckout />
      </section>

      <section
        id="settings"
        className="motion-section motion-container mb-2xl text-left"
      >
        <h2 className="typography-3xl text-dc-brand mb-sm">Settings</h2>
        <p className="mb-lg text-muted-foreground">
          Customize your preferences.
        </p>
        <form onSubmit={handleThemeSubmit} className="flex flex-col gap-lg">
          <div className="flex flex-col gap-sm">
            {themes.map((t) => (
              <label key={t} className="flex items-center gap-sm">
                <input
                  type="radio"
                  name="theme"
                  value={t}
                  checked={theme === t}
                  onChange={handleThemeChange}
                />
                <span className="capitalize">{t}</span>
              </label>
            ))}
          </div>
          <button
            type="submit"
            className="self-start bg-primary text-primary-foreground px-base py-sm rounded-md"
          >
            Save
          </button>
          {status && <p className="text-sm text-muted-foreground">{status}</p>}
        </form>
      </section>

      <section
        id="api-demo"
        className="motion-section motion-container mb-2xl text-left"
      >
        <h2 className="typography-3xl text-dc-brand mb-sm">API Demo</h2>
        <p className="mb-lg text-muted-foreground">Explore a sample API call.</p>
        {isLoading && <p>Loading...</p>}
        {error && <p>{error}</p>}
        {message && <p>{message}</p>}
      </section>
    </>
  );
}

