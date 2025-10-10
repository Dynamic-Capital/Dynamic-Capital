import type { ComponentProps, ReactNode } from "react";

import { Column } from "@/components/dynamic-ui-system";

import { cn } from "@/utils";

import styles from "./DeskSection.module.scss";

type ColumnBackground = ComponentProps<typeof Column>["background"];
type ColumnBorder = ComponentProps<typeof Column>["border"];
type ColumnGap = ComponentProps<typeof Column>["gap"];
type ColumnPadding = ComponentProps<typeof Column>["padding"];

type DeskSectionWidth = "default" | "compact" | "wide";

export interface DeskSectionProps {
  anchor?: string;
  background?: ColumnBackground;
  border?: ColumnBorder;
  gap?: ColumnGap;
  padding?: ColumnPadding;
  radius?: ComponentProps<typeof Column>["radius"];
  shadow?: ComponentProps<typeof Column>["shadow"];
  width?: DeskSectionWidth;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}

const WIDTH_CLASSNAME: Record<DeskSectionWidth, string | undefined> = {
  default: undefined,
  compact: styles.sectionCompact,
  wide: styles.sectionWide,
};

const DEFAULT_RADIUS = "l" as ComponentProps<typeof Column>["radius"];
const DEFAULT_PADDING = "xl" as ColumnPadding;
const DEFAULT_GAP = "24" as ColumnGap;

export function DeskSection({
  anchor,
  background,
  border,
  gap = DEFAULT_GAP,
  padding = DEFAULT_PADDING,
  radius = DEFAULT_RADIUS,
  shadow,
  width = "default",
  children,
  className,
  contentClassName,
}: DeskSectionProps) {
  return (
    <Column
      as="section"
      id={anchor}
      data-section-anchor={anchor}
      fillWidth
      background={background}
      border={border}
      radius={radius}
      padding={padding}
      gap={gap}
      shadow={shadow}
      className={cn(styles.section, WIDTH_CLASSNAME[width], className)}
    >
      <div className={cn("flex w-full flex-col gap-6", contentClassName)}>
        {children}
      </div>
    </Column>
  );
}

export default DeskSection;
