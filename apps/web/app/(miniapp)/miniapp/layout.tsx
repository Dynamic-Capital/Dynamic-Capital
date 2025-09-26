import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AppShell } from "@/components/miniapp/AppShell";
import { BottomNav } from "@/components/miniapp/BottomNav";
import { NavigationHeader } from "@/components/miniapp/NavigationHeader";
import MiniAppProviders from "./providers";
import "@/styles/theme.css";

export const metadata: Metadata = {
  title: "Dynamic Capital Mini App",
  description:
    "Native-feel Telegram experience with tabs, haptics, and telemetry.",
};

export default function MiniAppLayout({ children }: { children: ReactNode }) {
  return (
    <MiniAppProviders>
      <AppShell header={<NavigationHeader />} footer={<BottomNav />}>
        {children}
      </AppShell>
    </MiniAppProviders>
  );
}
