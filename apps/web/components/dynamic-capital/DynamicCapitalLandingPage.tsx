import { Column, RevealFx, Row, Schema } from "@once-ui-system/core";
import { AboutShowcase } from "@/components/dynamic-capital/home/AboutShowcase";
import { CheckoutCallout } from "@/components/dynamic-capital/home/CheckoutCallout";
import { ComplianceCertificates } from "@/components/dynamic-capital/home/ComplianceCertificates";
import { EconomicCalendarSection } from "@/components/dynamic-capital/home/EconomicCalendarSection";
import { FxMarketSnapshotSection } from "@/components/dynamic-capital/home/FxMarketSnapshotSection";
import { FundamentalAnalysisSection } from "@/components/dynamic-capital/home/FundamentalAnalysisSection";
import { HeroExperience } from "@/components/dynamic-capital/home/HeroExperience";
import { PerformanceInsightsSection } from "@/components/dynamic-capital/home/PerformanceInsightsSection";
import { ValuePropositionSection } from "@/components/dynamic-capital/home/ValuePropositionSection";
import { Mailchimp } from "@/components/dynamic-capital/Mailchimp";
import { MarketWatchlist } from "@/components/dynamic-capital/home/MarketWatchlist";
import { MentorshipProgramsSection } from "@/components/dynamic-capital/home/MentorshipProgramsSection";
import { PoolTradingSection } from "@/components/dynamic-capital/home/PoolTradingSection";
import { VipPackagesSection } from "@/components/dynamic-capital/home/VipPackagesSection";
import { about, baseURL, home, person, toAbsoluteUrl } from "@/resources";

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
      <RevealFx translateY="20" delay={0.6}>
        <ValuePropositionSection />
      </RevealFx>
      <RevealFx translateY="20" delay={0.64}>
        <PerformanceInsightsSection />
      </RevealFx>
      <Row
        fillWidth
        gap="24"
        wrap
        s={{ direction: "column" }}
        aria-label="Live market coverage"
      >
        <Column flex={1} minWidth={24} gap="16">
          <RevealFx translateY="20" delay={0.68}>
            <MarketWatchlist />
          </RevealFx>
        </Column>
        <Column flex={1} minWidth={24} gap="16">
          <Column gap="16">
            <RevealFx translateY="20" delay={0.72}>
              <FxMarketSnapshotSection />
            </RevealFx>
            <RevealFx translateY="20" delay={0.76}>
              <EconomicCalendarSection />
            </RevealFx>
          </Column>
        </Column>
      </Row>
      <Row
        fillWidth
        gap="24"
        wrap
        s={{ direction: "column" }}
        aria-label="Trading insights"
      >
        <Column flex={1} minWidth={24} gap="16">
          <RevealFx translateY="20" delay={0.78}>
            <FundamentalAnalysisSection />
          </RevealFx>
        </Column>
        <Column flex={1} minWidth={24} gap="16">
          <RevealFx translateY="20" delay={0.82}>
            <PoolTradingSection />
          </RevealFx>
        </Column>
      </Row>
      <RevealFx translateY="20" delay={0.86}>
        <MentorshipProgramsSection />
      </RevealFx>
      <Row
        fillWidth
        gap="24"
        wrap
        s={{ direction: "column" }}
        aria-label="Brand trust"
      >
        <Column flex={1} minWidth={24} gap="16">
          <RevealFx translateY="20" delay={0.9}>
            <ComplianceCertificates />
          </RevealFx>
        </Column>
        <Column flex={1} minWidth={24} gap="16">
          <RevealFx translateY="20" delay={0.94}>
            <AboutShowcase />
          </RevealFx>
        </Column>
      </Row>
      <RevealFx translateY="20" delay={0.98}>
        <VipPackagesSection />
      </RevealFx>
      <RevealFx translateY="20" delay={1.02}>
        <CheckoutCallout />
      </RevealFx>
      <Mailchimp />
    </Column>
  );
}
