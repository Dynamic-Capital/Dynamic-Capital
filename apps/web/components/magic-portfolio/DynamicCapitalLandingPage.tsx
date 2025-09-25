import { Column, RevealFx, Row, Schema } from "@once-ui-system/core";
import { AboutShowcase } from "@/components/magic-portfolio/home/AboutShowcase";
import { CheckoutCallout } from "@/components/magic-portfolio/home/CheckoutCallout";
import { ComplianceCertificates } from "@/components/magic-portfolio/home/ComplianceCertificates";
import { EconomicCalendarSection } from "@/components/magic-portfolio/home/EconomicCalendarSection";
import { FxMarketSnapshotSection } from "@/components/magic-portfolio/home/FxMarketSnapshotSection";
import { FundamentalAnalysisSection } from "@/components/magic-portfolio/home/FundamentalAnalysisSection";
import { HeroExperience } from "@/components/magic-portfolio/home/HeroExperience";
import { PerformanceInsightsSection } from "@/components/magic-portfolio/home/PerformanceInsightsSection";
import { ValuePropositionSection } from "@/components/magic-portfolio/home/ValuePropositionSection";
import { CommodityStrengthSection } from "@/components/magic-portfolio/home/CommodityStrengthSection";
import { Mailchimp } from "@/components/magic-portfolio/Mailchimp";
import { MarketWatchlist } from "@/components/magic-portfolio/home/MarketWatchlist";
import { MentorshipProgramsSection } from "@/components/magic-portfolio/home/MentorshipProgramsSection";
import { PoolTradingSection } from "@/components/magic-portfolio/home/PoolTradingSection";
import { VipPackagesSection } from "@/components/magic-portfolio/home/VipPackagesSection";
import { about, baseURL, home, person, toAbsoluteUrl } from "@/resources";
import { cn } from "@/utils";
import styles from "./DynamicCapitalLandingPage.module.scss";

export function DynamicCapitalLandingPage() {
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
      <div className={styles.section}>
        <HeroExperience />
      </div>
      <RevealFx translateY="20" delay={0.6}>
        <div className={styles.section}>
          <ValuePropositionSection />
        </div>
      </RevealFx>
      <RevealFx translateY="20" delay={0.64}>
        <div className={styles.section}>
          <PerformanceInsightsSection />
        </div>
      </RevealFx>
      <div className={cn(styles.section, styles.sectionTight)}>
        <Row
          className={styles.splitRow}
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
      </div>
      <RevealFx translateY="20" delay={0.76}>
        <div className={styles.section}>
          <CommodityStrengthSection />
        </div>
      </RevealFx>
      <div className={cn(styles.section, styles.sectionTight)}>
        <Row
          className={styles.splitRow}
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
      </div>
      <RevealFx translateY="20" delay={0.86}>
        <div className={styles.section}>
          <MentorshipProgramsSection />
        </div>
      </RevealFx>
      <div className={cn(styles.section, styles.sectionTight)}>
        <Row
          className={styles.splitRow}
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
      </div>
      <RevealFx translateY="20" delay={0.98}>
        <div className={styles.section}>
          <VipPackagesSection />
        </div>
      </RevealFx>
      <RevealFx translateY="20" delay={1.02}>
        <div className={styles.section}>
          <CheckoutCallout />
        </div>
      </RevealFx>
      <div className={styles.section}>
        <Mailchimp />
      </div>
    </Column>
  );
}
