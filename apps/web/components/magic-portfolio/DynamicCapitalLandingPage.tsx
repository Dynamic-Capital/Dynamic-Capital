import { Column, RevealFx, Schema } from "@once-ui-system/core";
import { AboutShowcase } from "@/components/magic-portfolio/home/AboutShowcase";
import { CheckoutCallout } from "@/components/magic-portfolio/home/CheckoutCallout";
import { ComplianceCertificates } from "@/components/magic-portfolio/home/ComplianceCertificates";
import { EconomicCalendarSection } from "@/components/magic-portfolio/home/EconomicCalendarSection";
import { FundamentalAnalysisSection } from "@/components/magic-portfolio/home/FundamentalAnalysisSection";
import { HeroExperience } from "@/components/magic-portfolio/home/HeroExperience";
import { Mailchimp } from "@/components/magic-portfolio/Mailchimp";
import { MarketWatchlist } from "@/components/magic-portfolio/home/MarketWatchlist";
import { MentorshipProgramsSection } from "@/components/magic-portfolio/home/MentorshipProgramsSection";
import { PoolTradingSection } from "@/components/magic-portfolio/home/PoolTradingSection";
import { VipPackagesSection } from "@/components/magic-portfolio/home/VipPackagesSection";
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
      <RevealFx translateY="20" delay={0.65}>
        <MarketWatchlist />
      </RevealFx>
      <RevealFx translateY="20" delay={0.7}>
        <EconomicCalendarSection />
      </RevealFx>
      <RevealFx translateY="20" delay={0.75}>
        <FundamentalAnalysisSection />
      </RevealFx>
      <RevealFx translateY="20" delay={0.8}>
        <AboutShowcase />
      </RevealFx>
      <RevealFx translateY="20" delay={0.84}>
        <ComplianceCertificates />
      </RevealFx>
      <RevealFx translateY="20" delay={0.88}>
        <MentorshipProgramsSection />
      </RevealFx>
      <RevealFx translateY="20" delay={0.92}>
        <PoolTradingSection />
      </RevealFx>
      <RevealFx translateY="20" delay={0.96}>
        <VipPackagesSection />
      </RevealFx>
      <RevealFx translateY="20" delay={1}>
        <CheckoutCallout />
      </RevealFx>
      <Mailchimp />
    </Column>
  );
}
