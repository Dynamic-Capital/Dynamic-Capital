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

const QUICK_LINKS = [
  { label: "Dynamic Trade & Learn", href: "/tools/dynamic-trade-and-learn" },
  { label: "Dynamic GUI optimizer", href: "/tools/dynamic-ui-optimizer" },
  { label: "Dynamic CLI/CD workbench", href: "/tools/dynamic-cli" },
  { label: "Dynamic market review", href: "/tools/dynamic-market-review" },
  { label: "Dynamic visual systems", href: "/tools/dynamic-visual" },
  { label: "Multi-LLM studio", href: "/tools/multi-llm" },
  { label: "Provider matrix", href: "/#provider-matrix" },
  { label: "Routing policies", href: "/#orchestration" },
  { label: "Observability", href: "/#analytics" },
  { label: "Guardrails", href: "/#resilience" },
  { label: "Plans & onboarding", href: "/plans" },
  { label: "Support", href: "/support" },
  { label: "Research", href: "/blog" },
];

const chunkLinks = <T,>(items: T[], columnCount: number): T[][] => {
  if (columnCount <= 0) {
    return [items];
  }
  const size = Math.ceil(items.length / columnCount);
  return Array.from({ length: columnCount }, (_, index) =>
    items.slice(index * size, index * size + size)
  ).filter((column) => column.length > 0);
};

const QUICK_LINK_COLUMNS = chunkLinks(QUICK_LINKS, 3);

export function SiteFooter() {
  const currentYear = new Date().getFullYear();
  const footerNav = NAV_ITEMS.filter((item) => item.showOnMobile).slice(0, 4);

  return (
    <footer className="relative w-full border-t border-border/60 bg-background/80 pb-[calc(2rem+var(--mobile-nav-height))]">
      <Column
        fillWidth
        gap="32"
        paddingX="16"
        paddingY="24"
        className="mx-auto w-full max-w-6xl"
      >
        <Row
          gap="24"
          wrap
          horizontal="between"
          vertical="center"
          className="rounded-2xl border border-border/60 bg-background/80 p-6 shadow-lg shadow-primary/10"
        >
          <Column gap="12" align="start" maxWidth={44}>
            <Tag size="s" background="brand-alpha-weak" prefixIcon="sparkles">
              Multi-LLM orchestration workspace
            </Tag>
            <Text variant="heading-strong-m" onBackground="neutral-strong">
              Ready to compare providers side by side?
            </Text>
            <Text variant="body-default-m" onBackground="neutral-weak">
              Launch the studio to benchmark models or book concierge setup to
              configure routing policies, observability, and guardrails for your
              desk.
            </Text>
          </Column>
          <Row gap="12" wrap horizontal="end">
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
        </Row>

        <div className="grid w-full gap-10 lg:grid-cols-[3fr,2fr]">
          <Column gap="16" align="start">
            <Text
              variant="label-default-s"
              className="uppercase"
              onBackground="neutral-weak"
            >
              Quick links
            </Text>
            <div className="grid w-full gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {QUICK_LINK_COLUMNS.map((column, index) => (
                <Column key={index} gap="8" className="min-w-[12rem]">
                  {column.map((link) => (
                    <a
                      key={link.href}
                      href={link.href}
                      className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
                    >
                      {link.label}
                    </a>
                  ))}
                </Column>
              ))}
            </div>
          </Column>
          <Column gap="16" align="start">
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
            <Text variant="body-default-xs" onBackground="neutral-weak">
              Need a guided run-through? Explore orchestration, routing, and
              compliance guardrails with the workspace team.
            </Text>
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
