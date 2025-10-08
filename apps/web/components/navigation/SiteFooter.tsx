import {
  Column,
  Heading,
  Row,
  SmartLink,
  Text,
} from "@/components/dynamic-ui-system";
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
    <SmartLink
      href={link.href}
      unstyled
      className="rounded-md px-1 py-0.5 text-sm text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      aria-label={`${link.label}. ${link.description}`}
      data-footer-category={link.categoryId}
    >
      <Text as="span" variant="body-default-s" onBackground="neutral-weak">
        {link.label}
      </Text>
    </SmartLink>
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
      <div className="mx-auto w-full max-w-6xl px-4 py-12">
        <Column gap="24">
          <Column gap="12" maxWidth={96}>
            <Text
              as="span"
              variant="label-default-xs"
              className="uppercase tracking-[0.28em] text-muted-foreground"
            >
              Dynamic Capital
            </Text>
            <Heading variant="heading-strong-l">
              Operate from a single, focused workspace.
            </Heading>
            <Text variant="body-default-s" onBackground="neutral-weak">
              Benchmark models, share context with your desk, and keep
              guardrails in view without juggling dashboards. Everything you
              need for a simple trading workflow lives here.
            </Text>
          </Column>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <Column gap="12">
              <Text
                as="span"
                variant="label-default-xs"
                className="uppercase tracking-wide text-muted-foreground"
              >
                Workspace
              </Text>
              <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
                {WORKSPACE_LINKS.map(renderLink)}
              </ul>
            </Column>
            <Column gap="12">
              <Text
                as="span"
                variant="label-default-xs"
                className="uppercase tracking-wide text-muted-foreground"
              >
                Quick links
              </Text>
              <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
                {QUICK_LINKS.map(renderLink)}
              </ul>
            </Column>
            <Column gap="12">
              <Text
                as="span"
                variant="label-default-xs"
                className="uppercase tracking-wide text-muted-foreground"
              >
                Connect
              </Text>
              <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
                {CONTACT_LINKS.map((item) => (
                  item.link
                    ? (
                      <li key={item.name}>
                        <SmartLink
                          href={item.link}
                          unstyled
                          className="rounded-md px-1 py-0.5 text-sm text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                          {...(isExternalLink(item.link)
                            ? { target: "_blank", rel: "noreferrer" }
                            : {})}
                        >
                          <Text
                            as="span"
                            variant="body-default-s"
                            onBackground="neutral-weak"
                          >
                            {item.name}
                          </Text>
                        </SmartLink>
                      </li>
                    )
                    : null
                ))}
              </ul>
            </Column>
          </div>

          <Row
            wrap
            gap="12"
            className="border-t border-border/40 pt-6 text-sm text-muted-foreground"
            style={{ borderColor: FOOTER_BORDER }}
          >
            <Text as="span" variant="body-default-s">
              © {currentYear} {schema.name}. All rights reserved.
            </Text>
            <Text
              as="span"
              variant="body-default-xs"
              onBackground="neutral-weak"
            >
              Built for teams who prefer a straightforward, dependable desk.
            </Text>
          </Row>
        </Column>
      </div>
    </footer>
  );
}

export default SiteFooter;
