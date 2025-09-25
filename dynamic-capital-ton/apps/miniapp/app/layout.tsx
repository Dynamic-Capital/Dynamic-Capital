import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dynamic Capital Mini App",
  description: "TON-powered subscriptions with auto-invest and burn",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
