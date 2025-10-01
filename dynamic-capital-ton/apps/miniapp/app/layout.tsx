import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dynamic Capital Mini App",
  description: "TON-powered subscriptions with auto-invest and burn",
};

export default function RootLayout(
  { children }: { children: React.ReactNode },
) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/tailwindcss@3.4.14/dist/tailwind.min.css"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
