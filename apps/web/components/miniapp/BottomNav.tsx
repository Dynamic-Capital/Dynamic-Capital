"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { haptic } from "@/lib/telegram";
import { track } from "@/lib/metrics";
import { MINIAPP_TABS } from "./navigation";

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="bottom-nav" role="navigation" aria-label="Mini app primary">
      <div className="bottom-nav-inner">
        {MINIAPP_TABS.map(({ href, label, Icon, analyticsEvent }) => {
          const active = pathname?.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`bottom-btn ${active ? "active" : ""}`}
              aria-current={active ? "page" : undefined}
              onClick={() => {
                haptic(active ? "light" : "medium");
                void track(analyticsEvent);
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
