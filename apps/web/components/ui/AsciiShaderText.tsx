"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";

import { cn } from "@/lib/utils";

const ASCII_PATTERN = "@#&%$/=+*";
const ASCII_LINES = Array.from({ length: 4 }, (_, index) => {
  const y = 14 + index * 9;
  return `<text x="0" y="${y}" font-family="'IBM Plex Mono','Roboto Mono',ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,'Liberation Mono','Courier New',monospace" font-size="12" letter-spacing="4" fill="white" fill-opacity="0.9">${
    ASCII_PATTERN.repeat(6)
  }</text>`;
}).join("");

const ASCII_TEXTURE = `url("data:image/svg+xml,${
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='320' height='48' viewBox='0 0 320 48'>${ASCII_LINES}</svg>`,
  )
}")`;
const DEFAULT_PAN_DURATION_SECONDS = 14;

type Intensity = "subtle" | "balanced" | "bold";

type CSSCustomProperties = React.CSSProperties & {
  "--ascii-shader-texture"?: string;
  "--ascii-mask-size"?: string;
  "--ascii-pan-duration"?: string;
};

export interface AsciiShaderTextProps
  extends Omit<React.HTMLAttributes<HTMLSpanElement>, "children"> {
  children: React.ReactNode;
  /**
   * Render the child element directly instead of a nested span.
   * Useful when composing with typography components that control semantics.
   */
  asChild?: boolean;
  /**
   * Controls how strong the overlay appears.
   */
  intensity?: Intensity;
  /**
   * Controls whether the shader animation runs. Disabling animation keeps the
   * gradient overlay static while retaining the ASCII mask styling.
   */
  animated?: boolean;
  /**
   * Adjusts the mask size used for the ASCII texture. Useful for tweaking the
   * pattern density for different text sizes.
   */
  maskSize?: string;
  /**
   * Customises how long the gradient takes to complete a pan cycle.
   * Values are clamped to be non-negative and expressed in seconds.
   */
  panDuration?: number;
}

export const AsciiShaderText = React.forwardRef<
  HTMLSpanElement,
  AsciiShaderTextProps
>(
  (
    {
      asChild = false,
      children,
      className,
      intensity = "balanced",
      animated = true,
      maskSize,
      panDuration,
      style,
      ...props
    },
    ref,
  ) => {
    const Component = asChild ? Slot : "span";
    const mergedStyle = React.useMemo(() => {
      const baseStyle = (style ?? {}) as CSSCustomProperties;
      const nextStyle: CSSCustomProperties = {
        ...baseStyle,
        "--ascii-shader-texture": ASCII_TEXTURE,
      };

      if (maskSize) {
        nextStyle["--ascii-mask-size"] = maskSize;
      }

      const resolvedDuration = animated
        ? Math.max(0, panDuration ?? DEFAULT_PAN_DURATION_SECONDS)
        : 0;
      nextStyle["--ascii-pan-duration"] = `${resolvedDuration}s`;

      return nextStyle;
    }, [animated, maskSize, panDuration, style]);

    return (
      <span
        ref={ref}
        className={cn("ascii-shader-text", className)}
        data-ascii-intensity={intensity}
        data-ascii-animated={animated ? "true" : "false"}
        style={mergedStyle}
        {...props}
      >
        <Component className="ascii-shader-text__content">{children}</Component>
      </span>
    );
  },
);

AsciiShaderText.displayName = "AsciiShaderText";
