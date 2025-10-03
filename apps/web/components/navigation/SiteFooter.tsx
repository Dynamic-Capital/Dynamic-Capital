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
              Quick links
            </Text>
            <Column gap="8">
              {QUICK_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
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
