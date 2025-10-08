import clsx from "clsx";
import { type CSSProperties, forwardRef } from "react";

import { Row } from "./internal/components/Row";
import type { RowProps } from "./internal/components/Row";
import type {
  Colors,
  ColorScheme,
  CondensedTShirtSizes,
} from "./internal/types";

import styles from "./Pulse.module.scss";

type PulseBaseProps = Omit<RowProps, "children">;

interface PulseProps extends PulseBaseProps {
  variant?: ColorScheme;
  size?: CondensedTShirtSizes;
  children?: RowProps["children"];
  className?: string;
  style?: CSSProperties;
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

    const containerProps: PulseBaseProps = {
      ...flex,
      minWidth: containerSize,
      minHeight: containerSize,
      center: true,
      className: clsx(styles.container, className),
      style,
    };

    const overlayProps: PulseBaseProps = {
      position: "absolute",
      className: styles.position,
      pointerEvents: "none",
    };

    const mediumDotProps: PulseBaseProps = {
      solid: mediumSolid,
      radius: "full",
      className: styles.dot,
      width: dotSize,
      height: dotSize,
    };

    const indicatorProps: PulseBaseProps = {
      solid: strongSolid,
      minWidth: indicatorSize,
      minHeight: indicatorSize,
      radius: "full",
    };

    return (
      <Row ref={ref} data-solid="color" {...containerProps}>
        <Row {...overlayProps}>
          <Row {...mediumDotProps} />
        </Row>
        <Row {...indicatorProps} />
        {children}
      </Row>
    );
  },
);

Pulse.displayName = "Pulse";

export { Pulse };
