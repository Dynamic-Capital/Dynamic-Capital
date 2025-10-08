import Link from "next/link";

import { schema, social } from "@/resources";

import { NAV_ITEMS } from "./nav-items";

const WORKSPACE_LINKS = NAV_ITEMS.slice(0, 4).map((item) => ({
  id: item.id,
  label: item.label,
  href: item.href ?? item.path,
}));

const QUICK_LINKS = [
  { label: "Multi-LLM studio", href: "/tools/multi-llm" },
  { label: "Plans", href: "/plans" },
  { label: "Support", href: "/support" },
  { label: "Research", href: "/blog" },
];

const CONTACT_LINKS = social.filter((item) =>
  ["Telegram", "Email", "Phone"].includes(item.name)
);

const isExternalLink = (href: string) => href.startsWith("http");

export function SiteFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border/60 bg-background/80">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-12">
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
            Dynamic Capital
          </p>
          <h2 className="text-2xl font-semibold text-foreground">
            Operate from a single, focused workspace.
          </h2>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Benchmark models, share context with your desk, and keep guardrails
            in view without juggling dashboards. Everything you need for a
            simple trading workflow lives here.
          </p>
        </div>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Workspace
            </h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {WORKSPACE_LINKS.map((link) => (
                <li key={link.id}>
                  <Link
                    href={link.href}
                    className="transition-colors hover:text-primary"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Quick links
            </h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {QUICK_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="transition-colors hover:text-primary"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Connect
            </h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {CONTACT_LINKS.map((item) => (
                item.link
                  ? (
                    <li key={item.name}>
                      <a
                        href={item.link}
                        className="transition-colors hover:text-primary"
                        {...(isExternalLink(item.link)
                          ? { target: "_blank", rel: "noreferrer" }
                          : {})}
                      >
                        {item.name}
                      </a>
                    </li>
                  )
                  : null
              ))}
            </ul>
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-border/40 pt-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© {currentYear} {schema.name}. All rights reserved.</p>
          <p className="text-xs sm:text-sm">
            Built for teams who prefer a straightforward, dependable desk.
          </p>
        </div>
      </div>
    </footer>
  );
}

export default SiteFooter;
