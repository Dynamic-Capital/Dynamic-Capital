"use client";

import dynamic from "next/dynamic";
import { Background, Column, RevealFx } from "@/components/dynamic-ui-system";
import { opacity, SpacingToken } from "@/components/dynamic-ui-system";
import { cn } from "@/utils";
import { dynamicUI } from "@/resources";
import { MultiLlmLandingPage } from "@/components/landing/MultiLlmLandingPage";
import type {
  ChromaBackgroundProps,
  ChromaBackgroundStyle,
} from "@/components/landing/ChromaBackground";

const DynamicChromaBackground = dynamic<ChromaBackgroundProps>(
  () => import("@/components/landing/ChromaBackground"),
  { ssr: false },
);

export interface LandingPageShellProps {
  /**
   * Optional className for the outer wrapper so consuming apps can augment layout spacing.
   */
  className?: string;
  /**
   * Optional dynamic Unicorn Studio background variant.
   */
  chromaBackgroundVariant?: ChromaBackgroundStyle | null;
}

export function LandingPageShell({
  className,
  chromaBackgroundVariant = null,
}: LandingPageShellProps) {
  const backgroundEffects = dynamicUI.effects.background;

  return (
    <Column
      fillWidth
      background="page"
      position="relative"
      overflow="hidden"
      paddingBottom="80"
      gap="32"
      className={cn("landing-page-shell", className)}
      style={{ minHeight: "100vh" }}
    >
      <RevealFx fill position="absolute">
        <Background
          mask={{
            x: backgroundEffects.mask.x,
            y: backgroundEffects.mask.y,
            radius: backgroundEffects.mask.radius,
            cursor: backgroundEffects.mask.cursor,
          }}
          gradient={{
            display: backgroundEffects.gradient.display,
            opacity: backgroundEffects.gradient.opacity as opacity,
            x: backgroundEffects.gradient.x,
            y: backgroundEffects.gradient.y,
            width: backgroundEffects.gradient.width,
            height: backgroundEffects.gradient.height,
            tilt: backgroundEffects.gradient.tilt,
            colorStart: backgroundEffects.gradient.colorStart,
            colorEnd: backgroundEffects.gradient.colorEnd,
          }}
          dots={{
            display: backgroundEffects.dots.display,
            opacity: backgroundEffects.dots.opacity as opacity,
            size: backgroundEffects.dots.size as SpacingToken,
            color: backgroundEffects.dots.color,
          }}
          grid={{
            display: backgroundEffects.grid.display,
            opacity: backgroundEffects.grid.opacity as opacity,
            color: backgroundEffects.grid.color,
            width: backgroundEffects.grid.width,
            height: backgroundEffects.grid.height,
          }}
          lines={{
            display: backgroundEffects.lines.display,
            opacity: backgroundEffects.lines.opacity as opacity,
            size: backgroundEffects.lines.size as SpacingToken,
            thickness: backgroundEffects.lines.thickness,
            angle: backgroundEffects.lines.angle,
            color: backgroundEffects.lines.color,
          }}
        />
      </RevealFx>
      {chromaBackgroundVariant
        ? (
          <DynamicChromaBackground
            variant={chromaBackgroundVariant}
            className="pointer-events-none absolute inset-0 z-0"
          />
        )
        : null}
      <Column
        zIndex={1}
        fillWidth
        paddingTop="40"
        paddingX="16"
        gap="32"
        horizontal="center"
      >
        <MultiLlmLandingPage />
      </Column>
    </Column>
  );
}
