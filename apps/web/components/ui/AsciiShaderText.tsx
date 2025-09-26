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

type Intensity = "subtle" | "balanced" | "bold";

type CSSCustomProperties = React.CSSProperties & {
  "--ascii-shader-texture"?: string;
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
      style,
      ...props
    },
    ref,
  ) => {
    const Component = asChild ? Slot : "span";
    const baseStyle = (style ?? {}) as CSSCustomProperties;
    const mergedStyle: CSSCustomProperties = {
      ...baseStyle,
      "--ascii-shader-texture": ASCII_TEXTURE,
    };

    return (
      <span
        ref={ref}
        className={cn("ascii-shader-text", className)}
        data-ascii-intensity={intensity}
        style={mergedStyle}
        {...props}
      >
        <Component className="ascii-shader-text__content">{children}</Component>
      </span>
    );
  },
);

AsciiShaderText.displayName = "AsciiShaderText";
