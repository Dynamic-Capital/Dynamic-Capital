import { Badge, Button, Column, Heading, RevealFx, Row, Schema, Text } from "@once-ui-system/core";
import { home, about, person, baseURL, toAbsoluteUrl } from "@/resources";
import { Mailchimp } from "@/components/magic-portfolio/Mailchimp";
import { AboutShowcase } from "@/components/magic-portfolio/home/AboutShowcase";
import { VipPackagesSection } from "@/components/magic-portfolio/home/VipPackagesSection";
import { CheckoutCallout } from "@/components/magic-portfolio/home/CheckoutCallout";
import { MentorshipProgramsSection } from "@/components/magic-portfolio/home/MentorshipProgramsSection";
import { PoolTradingSection } from "@/components/magic-portfolio/home/PoolTradingSection";
import { MarketWatchlist } from "@/components/magic-portfolio/home/MarketWatchlist";

export function MagicLandingPage() {
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
      <Column fillWidth horizontal="center" gap="m">
        <Column maxWidth="s" horizontal="center" align="center">
          {home.featured.display && (
            <RevealFx
              fillWidth
              horizontal="center"
              paddingTop="16"
              paddingBottom="32"
              paddingLeft="12"
            >
              <Badge
                background="brand-alpha-weak"
                paddingX="12"
                paddingY="4"
                onBackground="neutral-strong"
                textVariant="label-default-s"
                arrow={false}
                href={home.featured.href}
              >
                <Row paddingY="2">{home.featured.title}</Row>
              </Badge>
            </RevealFx>
          )}
          <RevealFx translateY="4" fillWidth horizontal="center" paddingBottom="16">
            <Heading wrap="balance" variant="display-strong-l">
              {home.headline}
            </Heading>
          </RevealFx>
          <RevealFx translateY="8" delay={0.2} fillWidth horizontal="center" paddingBottom="32">
            <Text wrap="balance" onBackground="neutral-weak" variant="heading-default-xl">
              {home.subline}
            </Text>
          </RevealFx>
          <RevealFx paddingTop="12" delay={0.4} horizontal="center" paddingLeft="12">
            <Row gap="12" s={{ direction: "column" }}>
              <Button
                id="about"
                data-border="rounded"
                href="/checkout"
                variant="primary"
                size="m"
                weight="default"
                prefixIcon="rocket"
              >
                Start checkout
              </Button>
              <Button
                data-border="rounded"
                href="#vip-packages"
                variant="secondary"
                size="m"
                weight="default"
                arrowIcon
              >
                View VIP packages
              </Button>
            </Row>
          </RevealFx>
        </Column>
      </Column>
      <RevealFx translateY="20" delay={0.65}>
        <MarketWatchlist />
      </RevealFx>
      <RevealFx translateY="20" delay={0.7}>
        <AboutShowcase />
      </RevealFx>
      <RevealFx translateY="20" delay={0.78}>
        <MentorshipProgramsSection />
      </RevealFx>
      <RevealFx translateY="20" delay={0.82}>
        <PoolTradingSection />
      </RevealFx>
      <RevealFx translateY="20" delay={0.86}>
        <VipPackagesSection />
      </RevealFx>
      <RevealFx translateY="20" delay={0.9}>
        <CheckoutCallout />
      </RevealFx>
      <Mailchimp />
    </Column>
  );
}
