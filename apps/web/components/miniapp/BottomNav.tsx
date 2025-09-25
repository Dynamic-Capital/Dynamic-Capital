"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, Home, PieChart, User } from "lucide-react";
import { haptic } from "@/lib/telegram";
import { track } from "@/lib/metrics";

const tabs = [
  { href: "/miniapp/home", label: "Home", Icon: Home, event: "nav_home" },
  { href: "/miniapp/fund", label: "Fund", Icon: PieChart, event: "nav_fund" },
  {
    href: "/miniapp/signals",
    label: "Signals",
    Icon: Activity,
    event: "nav_signals",
  },
  {
    href: "/miniapp/account",
    label: "Account",
    Icon: User,
    event: "nav_account",
  },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="bottom-nav" role="navigation" aria-label="Mini app primary">
      <div className="bottom-nav-inner">
        {tabs.map(({ href, label, Icon, event }) => {
          const active = pathname?.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`bottom-btn ${active ? "active" : ""}`}
              aria-current={active ? "page" : undefined}
              onClick={() => {
                haptic(active ? "light" : "medium");
                void track(event);
              }}
            >
              <span className="bottom-btn-highlight" aria-hidden />
              <span className="bottom-btn-icon">
                <Icon size={20} strokeWidth={active ? 2.4 : 2} />
              </span>
              <span className="bottom-btn-label">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
