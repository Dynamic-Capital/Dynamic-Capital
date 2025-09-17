import { ChatAssistantWidget } from "@/components/shared/ChatAssistantWidget";
import { cn } from "@/utils";

import { OnceLandingPageClient } from "./OnceLandingPageClient";

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
    <div
      className={cn(
        "min-h-screen space-y-16 bg-gradient-to-br from-background via-card/10 to-background pb-24",
        className,
      )}
    >
      <OnceLandingPageClient />
      {showAssistant ? <ChatAssistantWidget className={assistantClassName} /> : null}
    </div>
  );
}

