"use client";

import nextDynamic from 'next/dynamic';

export const dynamic = 'force-static';

const WebCheckout = nextDynamic(() => import('@/components/checkout/WebCheckout'), {
  ssr: false,
});

export default function HomePage() {
  return (
    <>
      <section className="motion-container min-h-screen bg-gradient-hero p-10 flex flex-col items-center justify-center text-center font-poppins">
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

      <section
        id="checkout"
        className="motion-container mb-2xl text-left"
      >
        <h2 className="typography-3xl text-dc-brand mb-sm">Checkout</h2>
        <p className="mb-lg text-muted-foreground">
          Complete your transaction securely.
        </p>
        <WebCheckout />
      </section>
    </>
  );
}
