"use client";

import {
  type ComponentPropsWithoutRef,
  forwardRef,
  type ReactNode,
  useId,
} from "react";

import { Textarea as OnceTextarea } from "@/components/dynamic-ui-system";
import { cn } from "@/utils";

type OnceTextareaProps = ComponentPropsWithoutRef<typeof OnceTextarea>;

interface TextareaProps extends
  Omit<
    OnceTextareaProps,
    | "id"
    | "className"
    | "hasPrefix"
    | "hasSuffix"
    | "surfaceClassName"
    | "textareaClassName"
    | "prefix"
    | "suffix"
  > {
  id?: string;
  className?: string;
  textareaClassName?: string;
  surfaceClassName?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      id: providedId,
      className,
      textareaClassName,
      surfaceClassName,
      leading,
      trailing,
      lines,
      radius,
      ...rest
    },
    ref,
  ) => {
    const generatedId = useId();
    const id = providedId ?? generatedId;

    return (
      <OnceTextarea
        ref={ref}
        id={id}
        lines={lines ?? 3}
        radius={radius}
        className={cn("w-full", className)}
        textareaClassName={textareaClassName}
        surfaceClassName={surfaceClassName}
        hasPrefix={leading}
        hasSuffix={trailing}
        {...rest}
      />
    );
  },
);

Textarea.displayName = "Textarea";

export { Textarea };
