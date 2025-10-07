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
import {
  CTA_LINKS,
  LANDING_SECTION_IDS,
} from "@/components/landing/landing-config";
import NAV_ITEMS from "./nav-items";

const QUICK_LINKS = [
  { label: "Overview", href: `/#${LANDING_SECTION_IDS.hero}` },
  { label: "Highlights", href: `/#${LANDING_SECTION_IDS.highlights}` },
  { label: "Desk rhythm", href: `/#${LANDING_SECTION_IDS.rhythm}` },
  { label: "Stakeholders", href: `/#${LANDING_SECTION_IDS.stakeholders}` },
  { label: "Join Telegram", href: CTA_LINKS.telegram, external: true },
  { label: "Launch desk", href: CTA_LINKS.invest, external: true },
];

export function SiteFooter() {
  const currentYear = new Date().getFullYear();
  const footerNav = NAV_ITEMS.filter((item) =>
    item.showOnMobile && item.href?.startsWith("/#")
  );

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
            Unified single-page desk
          </Tag>
          <Column gap="8" align="start" maxWidth={48}>
            <Text variant="heading-strong-m" onBackground="neutral-strong">
              Ready to stay in sync with the desk?
            </Text>
            <Text variant="body-default-m" onBackground="neutral-weak">
              Launch the experience to see momentum, treasury, and community
              updates pulse together, or drop into Telegram to follow the
              cadence live.
            </Text>
          </Column>
          <Row gap="12" wrap>
            <Button
              href={CTA_LINKS.invest}
              target="_blank"
              rel="noreferrer"
              variant="primary"
              data-border="rounded"
              arrowIcon
            >
              Launch the desk
            </Button>
            <Button
              href={CTA_LINKS.telegram}
              target="_blank"
              rel="noreferrer"
              variant="secondary"
              data-border="rounded"
            >
              Join Telegram
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
              Quick links
            </Text>
            <Column gap="8">
              {QUICK_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
                  target={link.external ? "_blank" : undefined}
                  rel={link.external ? "noreferrer" : undefined}
                >
                  {link.label}
                </a>
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
