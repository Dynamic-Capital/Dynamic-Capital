import {
  Button,
  Column,
  IconButton,
  Row,
  Tag,
  Text,
} from "@/components/dynamic-ui-system";
import { LetterFx } from "@/components/ui/animated-text";
import { schema, social } from "@/resources";
import NAV_ITEMS from "./nav-items";

const TELEGRAM_SUPPORT_URL =
  social.find((item) => item.name === "Telegram")?.link ??
    "https://t.me/DynamicCapital_Support";

const CONTACT_EMAIL = schema.email ?? "dynamiccaptialapp@gmail.com";

const CONTACT_EMAIL_LINK = social.find((item) => item.name === "Email")?.link ??
  `mailto:${CONTACT_EMAIL}`;

const QUICK_LINKS = [
  {
    label: "Overview",
    description:
      "Start with a plain-language tour of the workspace, pricing, and desk coverage tiers.",
    href: "/#overview",
    ctaLabel: "Explore the overview",
  },
  {
    label: "Market",
    description:
      "Check live FX, crypto, and metals dashboards to understand the market pulse before placing trades.",
    href: "/#live-markets",
    ctaLabel: "See live markets",
  },
  {
    label: "Learn",
    description:
      "Dive into beginner-friendly explainers that break down strategies, automation, and risk in simple terms.",
    href: "/blog",
    ctaLabel: "Visit the learning hub",
  },
  {
    label: "Chat",
    description:
      "Message the desk lead on Telegram whenever you need help translating workflows or configuring tools.",
    href: TELEGRAM_SUPPORT_URL,
    ctaLabel: "Start a Telegram chat",
    external: true,
  },
  {
    label: "About",
    description:
      "Meet the founder and learn how research, mentorship, and automation come together for members.",
    href: "/about",
    ctaLabel: "Meet the team",
  },
  {
    label: "Contact",
    description:
      `Prefer email? Reach us at ${CONTACT_EMAIL} and we’ll reply with next steps within one business day.`,
    href: CONTACT_EMAIL_LINK,
    ctaLabel: "Send an email",
  },
];

export function SiteFooter() {
  const currentYear = new Date().getFullYear();
  const footerNav = NAV_ITEMS.filter((item) => item.showOnMobile).slice(0, 4);

  return (
    <footer className="relative w-full border-t border-border/60 bg-background/80">
      <Column
        fillWidth
        gap="32"
        paddingX="16"
        paddingY="24"
        className="mx-auto max-w-6xl"
      >
        <Column gap="16" align="start">
          <Tag size="s" background="brand-alpha-weak" prefixIcon="sparkles">
            Multi-LLM orchestration workspace
          </Tag>
          <Column gap="8" align="start" maxWidth={48}>
            <Text variant="heading-strong-m" onBackground="neutral-strong">
              Ready to compare providers side by side?
            </Text>
            <Text variant="body-default-m" onBackground="neutral-weak">
              Launch the studio to benchmark models, or book concierge setup to
              configure routing policies, observability, and guardrails for your
              desk.
            </Text>
          </Column>
          <Row gap="12" wrap>
            <Button
              href="/tools/multi-llm"
              variant="primary"
              data-border="rounded"
              arrowIcon
            >
              Launch Multi-LLM Studio
            </Button>
            <Button href="/plans" variant="secondary" data-border="rounded">
              View workspace plans
            </Button>
          </Row>
        </Column>

        <div className="grid w-full gap-6 text-sm md:grid-cols-2">
          <Column gap="12">
            <Text
              variant="label-default-s"
              className="uppercase"
              onBackground="neutral-weak"
            >
              Quick start
            </Text>
            <Column gap="12">
              {QUICK_LINKS.map((link) => (
                <Column
                  key={link.label}
                  gap="8"
                  align="start"
                  className="rounded-2xl border border-border/40 bg-background/70 p-4 transition hover:border-primary/40 hover:bg-background"
                >
                  <Text
                    variant="label-strong-s"
                    className="uppercase tracking-wide"
                    onBackground="neutral-strong"
                  >
                    {link.label}
                  </Text>
                  <Text
                    variant="body-default-s"
                    onBackground="neutral-weak"
                  >
                    {link.description}
                  </Text>
                  {link.ctaLabel
                    ? (
                      <Button
                        href={link.href}
                        variant="tertiary"
                        data-border="rounded"
                        arrowIcon
                        target={link.external ? "_blank" : undefined}
                        rel={link.external ? "noreferrer" : undefined}
                      >
                        {link.ctaLabel}
                      </Button>
                    )
                    : null}
                </Column>
              ))}
            </Column>
          </Column>
          <Column gap="12">
            <Text
              variant="label-default-s"
              className="uppercase"
              onBackground="neutral-weak"
            >
              Workspace tour
            </Text>
            <Column gap="8">
              {footerNav.map((item) => (
                <a
                  key={item.id}
                  href={item.href ?? item.path}
                  className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
                >
                  {item.label}
                </a>
              ))}
            </Column>
          </Column>
        </div>

        <Row
          gap="16"
          wrap
          horizontal="between"
          vertical="center"
          className="border-t border-border/40 pt-6"
        >
          <Column gap="4">
            <Text variant="body-default-s" onBackground="neutral-weak">
              <LetterFx
                speed="medium"
                trigger="inView"
                charset="X$@aHz0y#?*01+"
                letterClassName="tracking-tight"
              >
                © {currentYear} {schema.name}. All rights reserved.
              </LetterFx>
            </Text>
            <Text variant="body-default-xs" onBackground="neutral-weak">
              SOC 2 aligned logging · Least privilege credential management ·
              Human-in-the-loop escalation paths
            </Text>
          </Column>
          <Row gap="12">
            {social.map((item) => (
              item.link
                ? (
                  <IconButton
                    key={item.name}
                    href={item.link}
                    icon={item.icon}
                    size="s"
                    variant="ghost"
                    tooltip={item.name}
                  />
                )
                : null
            ))}
          </Row>
        </Row>
      </Column>
    </footer>
  );
}

export default SiteFooter;
