import { Column, RevealFx, Row, Schema } from "@once-ui-system/core";
import { AboutShowcase } from "@/components/dynamic-portfolio/home/AboutShowcase";
import { CheckoutCallout } from "@/components/dynamic-portfolio/home/CheckoutCallout";
import { ComplianceCertificates } from "@/components/dynamic-portfolio/home/ComplianceCertificates";
import { EconomicCalendarSection } from "@/components/dynamic-portfolio/home/EconomicCalendarSection";
import { FundamentalAnalysisSection } from "@/components/dynamic-portfolio/home/FundamentalAnalysisSection";
import { HeroExperience } from "@/components/dynamic-portfolio/home/HeroExperience";
import { ValuePropositionSection } from "@/components/dynamic-portfolio/home/ValuePropositionSection";
import { Mailchimp } from "@/components/dynamic-portfolio/Mailchimp";
import { MarketWatchlist } from "@/components/dynamic-portfolio/home/MarketWatchlist";
import { MentorshipProgramsSection } from "@/components/dynamic-portfolio/home/MentorshipProgramsSection";
import { PoolTradingSection } from "@/components/dynamic-portfolio/home/PoolTradingSection";
import { VipPackagesSection } from "@/components/dynamic-portfolio/home/VipPackagesSection";
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
          <RevealFx translateY="20" delay={0.72}>
            <EconomicCalendarSection />
          </RevealFx>
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
