import { type ReactNode } from "react";
import { Column, RevealFx, Row, Schema } from "@once-ui-system/core";
import { AboutShowcase } from "@/components/magic-portfolio/home/AboutShowcase";
import { CheckoutCallout } from "@/components/magic-portfolio/home/CheckoutCallout";
import { ComplianceCertificates } from "@/components/magic-portfolio/home/ComplianceCertificates";
import { EconomicCalendarSection } from "@/components/magic-portfolio/home/EconomicCalendarSection";
import { FundamentalAnalysisSection } from "@/components/magic-portfolio/home/FundamentalAnalysisSection";
import { HeroExperience } from "@/components/magic-portfolio/home/HeroExperience";
import { MarketWatchlist } from "@/components/magic-portfolio/home/MarketWatchlist";
import { MentorshipProgramsSection } from "@/components/magic-portfolio/home/MentorshipProgramsSection";
import { PoolTradingSection } from "@/components/magic-portfolio/home/PoolTradingSection";
import {
  SectionNavigation,
  type SectionNavItem,
} from "@/components/magic-portfolio/home/SectionNavigation";
import { ValuePropositionSection } from "@/components/magic-portfolio/home/ValuePropositionSection";
import { VipPackagesSection } from "@/components/magic-portfolio/home/VipPackagesSection";
import { Mailchimp } from "@/components/magic-portfolio/Mailchimp";
import { about, baseURL, home, person, toAbsoluteUrl } from "@/resources";

type SectionColumnConfig = {
  key: string;
  element: ReactNode;
  delay: number;
  minWidth?: number;
};

type SectionRowConfig = {
  key: string;
  ariaLabel: string;
  columns: SectionColumnConfig[];
};

type SingleSectionConfig = {
  key: string;
  element: ReactNode;
  delay: number;
};

const SECTION_NAV_ITEMS: SectionNavItem[] = [
  {
    id: "value-proposition",
    label: "Why the desk",
    description: "Clarity, guardrails, and accountability",
    icon: "shield",
  },
  {
    id: "market-watchlist",
    label: "Live watchlist",
    description: "Spot quotes with desk bias",
    icon: "activity",
  },
  {
    id: "economic-calendar",
    label: "Catalysts",
    description: "Macro events & trading plans",
    icon: "calendar",
  },
  {
    id: "fundamental-analysis",
    label: "Fundamentals",
    description: "Conviction positioning notes",
    icon: "trending-up",
  },
  {
    id: "pool-trading",
    label: "Pool trading",
    description: "Managed capital controls",
    icon: "coins",
  },
  {
    id: "mentorship-programs",
    label: "Mentorship",
    description: "Cohorts & accountability",
    icon: "users",
  },
  {
    id: "compliance",
    label: "Compliance",
    description: "Security certifications",
    icon: "check",
  },
  {
    id: "about-desk",
    label: "Desk lead",
    description: "Meet the operators",
    icon: "globe",
  },
  {
    id: "vip-packages",
    label: "VIP packages",
    description: "Membership pricing",
    icon: "sparkles",
  },
  {
    id: "checkout",
    label: "Checkout",
    description: "Activate the desk",
    icon: "rocket",
  },
];

const SECTION_ROWS_BEFORE_MENTORSHIP: SectionRowConfig[] = [
  {
    key: "market-intel",
    ariaLabel: "Live market coverage",
    columns: [
      {
        key: "market-watchlist",
        element: <MarketWatchlist />,
        delay: 0.7,
        minWidth: 24,
      },
      {
        key: "economic-calendar",
        element: <EconomicCalendarSection />,
        delay: 0.74,
        minWidth: 24,
      },
    ],
  },
  {
    key: "trading-insights",
    ariaLabel: "Trading insights",
    columns: [
      {
        key: "fundamental-analysis",
        element: <FundamentalAnalysisSection />,
        delay: 0.78,
        minWidth: 24,
      },
      {
        key: "pool-trading",
        element: <PoolTradingSection />,
        delay: 0.82,
        minWidth: 24,
      },
    ],
  },
];

const SECTION_ROWS_AFTER_MENTORSHIP: SectionRowConfig[] = [
  {
    key: "brand-trust",
    ariaLabel: "Brand trust",
    columns: [
      {
        key: "compliance",
        element: <ComplianceCertificates />,
        delay: 0.9,
        minWidth: 24,
      },
      {
        key: "about-desk",
        element: <AboutShowcase />,
        delay: 0.94,
        minWidth: 24,
      },
    ],
  },
];

const FINAL_SECTIONS: SingleSectionConfig[] = [
  {
    key: "vip-packages",
    element: <VipPackagesSection />,
    delay: 0.98,
  },
  {
    key: "checkout",
    element: <CheckoutCallout />,
    delay: 1.02,
  },
];

function SectionRows({ rows }: { rows: SectionRowConfig[] }) {
  if (!rows.length) {
    return null;
  }

  return (
    <>
      {rows.map((row) => (
        <Row
          key={row.key}
          fillWidth
          gap="24"
          wrap
          s={{ direction: "column" }}
          aria-label={row.ariaLabel}
        >
          {row.columns.map((column) => (
            <Column
              key={column.key}
              flex={1}
              minWidth={column.minWidth ?? 24}
              gap="16"
            >
              <RevealFx translateY="20" delay={column.delay}>
                {column.element}
              </RevealFx>
            </Column>
          ))}
        </Row>
      ))}
    </>
  );
}

export function DynamicCapitalLandingPage() {
  return (
    <Column maxWidth="m" gap="xl" paddingY="12" horizontal="center">
      <Schema
        as="webPage"
        baseURL={baseURL}
        path={home.path}
        title={home.title}
        description={home.description}
        image={`/api/og/generate?title=${encodeURIComponent(home.title)}`}
        author={{
          name: person.name,
          url: `${baseURL}${about.path}`,
          image: toAbsoluteUrl(baseURL, person.avatar),
        }}
      />
      <HeroExperience />
      <RevealFx translateY="20" delay={0.62}>
        <SectionNavigation items={SECTION_NAV_ITEMS} />
      </RevealFx>
      <RevealFx translateY="20" delay={0.66}>
        <ValuePropositionSection />
      </RevealFx>
      <SectionRows rows={SECTION_ROWS_BEFORE_MENTORSHIP} />
      <RevealFx translateY="20" delay={0.86}>
        <MentorshipProgramsSection />
      </RevealFx>
      <SectionRows rows={SECTION_ROWS_AFTER_MENTORSHIP} />
      {FINAL_SECTIONS.map((section) => (
        <RevealFx key={section.key} translateY="20" delay={section.delay}>
          {section.element}
        </RevealFx>
      ))}
      <Mailchimp />
    </Column>
  );
}
