import Link from "next/link";

import { dynamicBranding, schema, social } from "@/resources";

import { type FooterLinkEntry, getFooterLinks } from "@/config/route-registry";

const WORKSPACE_LINKS = getFooterLinks("workspace");
const QUICK_LINKS = getFooterLinks("quick");

const footerMotion = dynamicBranding.gradients.motion;
const footerGlass = dynamicBranding.gradients.glass;
const FOOTER_GRADIENT = footerMotion.backgroundDark;
const FOOTER_SHADOW = footerGlass.motionShadowDark ??
  "0 24px 96px hsl(var(--primary) / 0.18)";
const FOOTER_BORDER = footerGlass.motionBorderDark ??
  "hsl(var(--border) / 0.65)";

const CONTACT_LINKS = social.filter((item) =>
  ["Telegram", "Email", "Phone"].includes(item.name)
);

const isExternalLink = (href: string) => href.startsWith("http");

const renderLink = (link: FooterLinkEntry) => (
  <li key={link.id}>
    <Link
      href={link.href}
      className="transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      aria-label={`${link.label}. ${link.description}`}
      data-footer-category={link.categoryId}
    >
      {link.label}
    </Link>
  </li>
);

export function SiteFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer
      className="relative overflow-hidden border-t border-border/60 bg-background/90"
      style={{ boxShadow: FOOTER_SHADOW }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-60 mix-blend-plus-lighter"
        style={{ backgroundImage: FOOTER_GRADIENT }}
        aria-hidden
      />
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
              {WORKSPACE_LINKS.map(renderLink)}
            </ul>
          </div>
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Quick links
            </h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {QUICK_LINKS.map(renderLink)}
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
                        className="transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
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

        <div
          className="flex flex-col gap-2 border-t border-border/40 pt-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between"
          style={{ borderColor: FOOTER_BORDER }}
        >
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
