import { Background, Column, RevealFx } from "@once-ui-system/core";
import { opacity, SpacingToken } from "@once-ui-system/core";
import { ChatAssistantWidget } from "@/components/shared/ChatAssistantWidget";
import { cn } from "@/utils";
import { effects } from "@/resources";
import { MagicLandingPage } from "@/components/magic-portfolio/MagicLandingPage";

export interface LandingPageShellProps {
  /**
   * Optional className for the outer wrapper so consuming apps can augment layout spacing.
   */
  className?: string;
  /**
   * Control whether the chat assistant widget is rendered. Enabled by default.
   */
  showAssistant?: boolean;
  /**
   * Additional className passed to the chat assistant widget when rendered.
   */
  assistantClassName?: string;
}

export function LandingPageShell({
  className,
  showAssistant = true,
  assistantClassName,
}: LandingPageShellProps) {
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
            x: effects.mask.x,
            y: effects.mask.y,
            radius: effects.mask.radius,
            cursor: effects.mask.cursor,
          }}
          gradient={{
            display: effects.gradient.display,
            opacity: effects.gradient.opacity as opacity,
            x: effects.gradient.x,
            y: effects.gradient.y,
            width: effects.gradient.width,
            height: effects.gradient.height,
            tilt: effects.gradient.tilt,
            colorStart: effects.gradient.colorStart,
            colorEnd: effects.gradient.colorEnd,
          }}
          dots={{
            display: effects.dots.display,
            opacity: effects.dots.opacity as opacity,
            size: effects.dots.size as SpacingToken,
            color: effects.dots.color,
          }}
          grid={{
            display: effects.grid.display,
            opacity: effects.grid.opacity as opacity,
            color: effects.grid.color,
            width: effects.grid.width,
            height: effects.grid.height,
          }}
          lines={{
            display: effects.lines.display,
            opacity: effects.lines.opacity as opacity,
            size: effects.lines.size as SpacingToken,
            thickness: effects.lines.thickness,
            angle: effects.lines.angle,
            color: effects.lines.color,
          }}
        />
      </RevealFx>
      <Column
        zIndex={1}
        fillWidth
        paddingTop="40"
        paddingX="16"
        gap="32"
        horizontal="center"
      >
        <MagicLandingPage />
      </Column>
      {showAssistant ? (
        <Column zIndex={1} paddingX="16">
          <ChatAssistantWidget className={assistantClassName} />
        </Column>
      ) : null}
    </Column>
  );
}

