"use client";

import {
  type ComponentProps,
  type CSSProperties,
  forwardRef,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import styles from "@once-ui-system/core/dist/components/RevealFx.module.scss";
import { Flex } from "@once-ui-system/core";
import type { SpacingToken } from "@once-ui-system/core";

const DEFAULT_TRANSLATE_Y = "2rem";

type TimeoutHandle = ReturnType<typeof setTimeout>;

interface RevealFxProps extends Omit<ComponentProps<typeof Flex>, "ref"> {
  children: ReactNode;
  speed?: "slow" | "medium" | "fast" | number;
  delay?: number;
  revealedByDefault?: boolean;
  /**
   * Optional vertical offset before reveal. Defaults to 2rem when omitted.
   */
  translateY?: number | SpacingToken;
  trigger?: boolean;
  style?: CSSProperties;
  className?: string;
}

const RevealFx = forwardRef<HTMLDivElement, RevealFxProps>(
  (
    {
      children,
      speed = "medium",
      delay = 0,
      revealedByDefault = false,
      translateY,
      trigger,
      style,
      className,
      ...rest
    },
    ref,
  ) => {
    const [isRevealed, setIsRevealed] = useState(revealedByDefault);
    const [maskRemoved, setMaskRemoved] = useState(false);
    const transitionTimeoutRef = useRef<TimeoutHandle | null>(null);

    const speedDurationMs = useMemo(() => {
      if (typeof speed === "number") {
        return speed;
      }

      switch (speed) {
        case "fast":
          return 1000;
        case "medium":
          return 2000;
        case "slow":
          return 3000;
        default:
          return 2000;
      }
    }, [speed]);

    const speedDuration = useMemo(
      () => `${speedDurationMs / 1000}s`,
      [speedDurationMs],
    );

    useEffect(() => {
      const timer = setTimeout(() => {
        setIsRevealed(true);
        transitionTimeoutRef.current = setTimeout(() => {
          setMaskRemoved(true);
        }, speedDurationMs);
      }, delay * 1000);

      return () => {
        clearTimeout(timer);
        if (transitionTimeoutRef.current) {
          clearTimeout(transitionTimeoutRef.current);
        }
      };
    }, [delay, speedDurationMs]);

    useEffect(() => {
      if (trigger === undefined) {
        return;
      }

      setIsRevealed(trigger);
      setMaskRemoved(false);

      if (trigger) {
        if (transitionTimeoutRef.current) {
          clearTimeout(transitionTimeoutRef.current);
        }
        transitionTimeoutRef.current = setTimeout(() => {
          setMaskRemoved(true);
        }, speedDurationMs);
      }
    }, [speedDurationMs, trigger]);

    const getTranslateYValue = () => {
      if (typeof translateY === "number") {
        return `${translateY}rem`;
      }

      if (typeof translateY === "string") {
        return `var(--static-space-${translateY})`;
      }

      return DEFAULT_TRANSLATE_Y;
    };

    const translateValue = getTranslateYValue();
    const revealStyle: CSSProperties = {
      transitionDuration: speedDuration,
      transform: isRevealed ? "translateY(0)" : `translateY(${translateValue})`,
      ...style,
    };

    if (maskRemoved) {
      return (
        <Flex
          fillWidth
          ref={ref}
          style={revealStyle}
          className={`${styles.revealedNoMask} ${className || ""}`.trim()}
          {...rest}
        >
          {children}
        </Flex>
      );
    }

    return (
      <Flex
        fillWidth
        ref={ref}
        style={revealStyle}
        className={`${styles.revealFx} ${
          isRevealed ? styles.revealed : styles.hidden
        } ${className || ""}`.trim()}
        {...rest}
      >
        {children}
      </Flex>
    );
  },
);

RevealFx.displayName = "RevealFx";

export { RevealFx };
export type { RevealFxProps };
