import { type ComponentProps, forwardRef, type ReactNode } from "react";
import { Row } from "@once-ui-system/core/components";
import styles from "@once-ui-system/core/dist/components/Pulse.module.scss";
import type {
  Colors,
  ColorScheme,
  CondensedTShirtSizes,
} from "@once-ui-system/core";

interface PulseProps extends ComponentProps<typeof Row> {
  variant?: ColorScheme;
  size?: CondensedTShirtSizes;
  children?: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

const Pulse = forwardRef<HTMLDivElement, PulseProps>(
  (
    {
      children,
      className,
      style,
      size = "m",
      variant = "brand",
      ...flex
    },
    ref,
  ) => {
    const dotSize = size === "s" ? "32" : size === "m" ? "48" : "64";
    const indicatorSize = size === "s" ? "4" : size === "m" ? "8" : "12";
    const containerSize = size === "s" ? "16" : size === "m" ? "24" : "32";

    const mediumSolid = `${variant}-medium` as Colors;
    const strongSolid = `${variant}-strong` as Colors;

    return (
      <Row
        ref={ref}
        minWidth={containerSize}
        minHeight={containerSize}
        center
        data-solid="color"
        className={className}
        style={style}
        {...flex}
      >
        <Row position="absolute" className={styles.position}>
          <Row
            solid={mediumSolid}
            radius="full"
            className={styles.dot}
            width={dotSize}
            height={dotSize}
          />
        </Row>
        <Row
          solid={strongSolid}
          minWidth={indicatorSize}
          minHeight={indicatorSize}
          radius="full"
        />
        {children}
      </Row>
    );
  },
);

Pulse.displayName = "Pulse";

export { Pulse };
