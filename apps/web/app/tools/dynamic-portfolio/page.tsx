import type { ReactNode } from "react";

import {
  Column,
  Heading,
  RevealFx,
  Schema,
  Text,
} from "@/components/dynamic-ui-system";

import { HeroExperience } from "@/components/magic-portfolio/home/HeroExperience";
import { ValuePropositionSection } from "@/components/magic-portfolio/home/ValuePropositionSection";
import { PerformanceInsightsSection } from "@/components/magic-portfolio/home/PerformanceInsightsSection";
import { MentorshipProgramsSection } from "@/components/magic-portfolio/home/MentorshipProgramsSection";
import { LossRecoveryProgrammeSection } from "@/components/magic-portfolio/home/LossRecoveryProgrammeSection";
import { PoolTradingSection } from "@/components/magic-portfolio/home/PoolTradingSection";
import { VipPlansPricingSection } from "@/components/magic-portfolio/home/VipPlansPricingSection";
import { VipPackagesSection } from "@/components/magic-portfolio/home/VipPackagesSection";
import { CheckoutCallout } from "@/components/magic-portfolio/home/CheckoutCallout";
import { Projects } from "@/components/magic-portfolio/work/Projects";
import { about, baseURL, person, toAbsoluteUrl } from "@/resources";
import styles from "@/components/magic-portfolio/DynamicCapitalLandingPage.module.scss";
import { cn } from "@/utils";

const pageTitle = "Dynamic portfolio – Dynamic Capital";
const pageDescription =
  "Explore the Dynamic Capital desk experience with mentorship, performance insights, pool trading, and VIP membership pathways.";
const pagePath = "/tools/dynamic-portfolio";

type SectionVariant = "compact" | "wide";

interface SectionAnchor {
  id: string;
  ariaLabel?: string;
}

interface PageSectionProps {
  children: ReactNode;
  variant?: SectionVariant;
  reveal?: boolean;
  revealDelay?: number;
  anchor?: SectionAnchor;
}

function PageSection({
  children,
  variant = "compact",
  reveal = true,
  revealDelay,
  anchor,
}: PageSectionProps) {
  const SectionComponent = (anchor ? "section" : "div") as "section" | "div";
  const section = (
    <SectionComponent
      id={anchor?.id}
      aria-label={anchor?.ariaLabel}
      data-section-anchor={anchor?.id}
      className={cn(
        styles.section,
        variant === "wide" ? styles.sectionWide : styles.sectionCompact,
      )}
    >
      {children}
    </SectionComponent>
  );

  if (!reveal) {
    return section;
  }

  return (
    <RevealFx translateY="16" delay={revealDelay}>
      {section}
    </RevealFx>
  );
}

export const metadata = {
  title: pageTitle,
  description: pageDescription,
};

export default function DynamicPortfolioPage() {
  return (
    <Column
      as="main"
      fillWidth
      gap="xl"
      horizontal="center"
      className={styles.page}
    >
      <Schema
        as="webPage"
        baseURL={baseURL}
        path={pagePath}
        title={pageTitle}
        description={pageDescription}
        image={`/api/og/generate?title=${encodeURIComponent(pageTitle)}`}
        author={{
          name: person.name,
          url: `${baseURL}${about.path}`,
          image: toAbsoluteUrl(baseURL, person.avatar),
        }}
      />

      <PageSection reveal={false}>
        <Column gap="12" align="center" horizontal="center">
          <Heading variant="display-strong-s" align="center">
            Dynamic portfolio
          </Heading>
          <Text
            variant="body-default-m"
            onBackground="neutral-weak"
            align="center"
          >
            Walk through the full Dynamic Capital desk workflow—from the
            interactive onboarding hero to membership, mentorship, and
            proof-backed case studies.
          </Text>
        </Column>
      </PageSection>

      <PageSection reveal={false} variant="wide">
        <HeroExperience />
      </PageSection>

      <PageSection revealDelay={0.16}>
        <ValuePropositionSection />
      </PageSection>

      <PageSection revealDelay={0.24}>
        <PerformanceInsightsSection />
      </PageSection>

      <PageSection revealDelay={0.32}>
        <MentorshipProgramsSection />
      </PageSection>

      <PageSection revealDelay={0.4}>
        <LossRecoveryProgrammeSection />
      </PageSection>

      <PageSection revealDelay={0.48}>
        <PoolTradingSection />
      </PageSection>

      <PageSection revealDelay={0.56}>
        <VipPlansPricingSection />
      </PageSection>

      <PageSection revealDelay={0.64}>
        <VipPackagesSection />
      </PageSection>

      <PageSection revealDelay={0.72}>
        <CheckoutCallout />
      </PageSection>

      <PageSection revealDelay={0.8}>
        <Column gap="20" align="start">
          <Heading variant="display-strong-xs">Case studies</Heading>
          <Text variant="body-default-m" onBackground="neutral-weak">
            Review recent projects that demonstrate how the desk accelerates
            readiness, automation, and live capital outcomes.
          </Text>
          <Projects range={[1, 6]} />
        </Column>
      </PageSection>
    </Column>
  );
}
