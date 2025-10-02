"use client";

import { type CSSProperties, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Column, Line, Row } from "@/components/dynamic-ui-system";

import {
  BRAND_GLASS,
  BRAND_GRADIENTS,
  BRAND_METADATA,
  METRIC_HIGHLIGHTS,
  PLAN_PRESETS,
  WORKFLOW_STEPS,
} from "./constants";
import { CallToAction } from "./CallToAction";
import { HeroSection } from "./HeroSection";
import { MetricHighlights } from "./MetricHighlights";
import { PlanSelector } from "./PlanSelector";
import { WorkflowTimeline } from "./WorkflowTimeline";

export function DynamicGuiShowcase() {
  const navigate = useNavigate();
  const [activePlanId, setActivePlanId] = useState<string>(PLAN_PRESETS[0].id);
  const [activeStepIndex, setActiveStepIndex] = useState<number>(0);

  const heroSurfaceStyle = useMemo<CSSProperties>(
    () => ({
      backgroundImage: BRAND_GRADIENTS.hero,
      border: "1px solid hsl(var(--dc-brand) / 0.16)",
      boxShadow: BRAND_GLASS.motionShadow,
      backdropFilter: BRAND_GLASS.motionBlur,
      position: "relative",
      overflow: "hidden",
    }),
    [],
  );

  const planPanelStyle = useMemo<CSSProperties>(
    () => ({
      backgroundImage: BRAND_GRADIENTS.motion.card,
      border: "1px solid hsl(var(--dc-brand) / 0.12)",
      backdropFilter: BRAND_GLASS.motionBlur,
    }),
    [],
  );

  const timelinePanelStyle = useMemo<CSSProperties>(
    () => ({
      backgroundImage: BRAND_GRADIENTS.card,
      border: "1px solid hsl(var(--dc-brand) / 0.08)",
      backdropFilter: BRAND_GLASS.motionBlur,
    }),
    [],
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const interval = window.setInterval(() => {
      setActiveStepIndex((previous) => (previous + 1) % WORKFLOW_STEPS.length);
    }, 6000);

    return () => window.clearInterval(interval);
  }, []);

  const selectedPlan = useMemo(
    () => PLAN_PRESETS.find((plan) => plan.id === activePlanId) ?? PLAN_PRESETS[0],
    [activePlanId],
  );

  const activeStep = useMemo(
    () => WORKFLOW_STEPS[activeStepIndex] ?? WORKFLOW_STEPS[0],
    [activeStepIndex],
  );

  return (
    <Column gap="48" fillWidth align="center" horizontal="center">
      <Column
        as="section"
        fillWidth
        maxWidth="l"
        paddingX="16"
        paddingY="48"
        gap="40"
        align="center"
        horizontal="center"
      >
        <Column
          background="surface"
          border="transparent"
          radius="xl"
          shadow="xl"
          padding="xl"
          gap="32"
          fillWidth
          align="center"
          horizontal="center"
          style={heroSurfaceStyle}
        >
          <Row
            position="absolute"
            pointerEvents="none"
            style={{
              top: 0,
              right: 0,
              bottom: 0,
              left: 0,
              backgroundImage: BRAND_GRADIENTS.motion.backgroundLight,
              opacity: 0.55,
            }}
          />
          <Row
            position="absolute"
            pointerEvents="none"
            style={{
              top: "-40%",
              right: "-40%",
              bottom: "-40%",
              left: "-40%",
              backgroundImage: BRAND_GRADIENTS.brand,
              opacity: 0.08,
            }}
          />

          <HeroSection
            brandName={BRAND_METADATA.name}
            brandTagline={BRAND_METADATA.tagline}
            onLaunchCheckout={() => navigate("/checkout")}
            onPreviewVip={() => navigate("/checkout?plan=vip")}
          />

          <MetricHighlights metrics={METRIC_HIGHLIGHTS} />

          <PlanSelector
            plans={PLAN_PRESETS}
            activePlanId={activePlanId}
            onSelect={setActivePlanId}
            panelStyle={planPanelStyle}
            selectedPlan={selectedPlan}
          />

          <WorkflowTimeline
            steps={WORKFLOW_STEPS}
            activeStepIndex={activeStepIndex}
            onSelect={setActiveStepIndex}
            panelStyle={timelinePanelStyle}
            activeStep={activeStep}
          />

          <Line background="neutral-alpha-weak" />

          <CallToAction
            onStartOnboarding={() => navigate("/checkout")}
            onRequestWalkthrough={() => navigate("/checkout?promo=desk-demo")}
          />
        </Column>
      </Column>
    </Column>
  );
}

export default DynamicGuiShowcase;
