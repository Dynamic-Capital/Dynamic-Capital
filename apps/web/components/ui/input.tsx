"use client";

import {
  type ComponentPropsWithoutRef,
  forwardRef,
  type ReactNode,
  useId,
} from "react";

import { Input as OnceInput } from "@/components/dynamic-ui-system";
import { cn } from "@/utils";

type OnceInputProps = ComponentPropsWithoutRef<typeof OnceInput>;

interface InputProps extends
  Omit<
    OnceInputProps,
    | "id"
    | "className"
    | "hasPrefix"
    | "hasSuffix"
    | "surfaceClassName"
    | "inputClassName"
    | "prefix"
    | "suffix"
  > {
  id?: string;
  className?: string;
  inputClassName?: string;
  surfaceClassName?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      id: providedId,
      className,
      inputClassName,
      surfaceClassName,
      leading,
      trailing,
      height,
      radius,
      ...rest
    },
    ref,
  ) => {
    const generatedId = useId();
    const id = providedId ?? generatedId;

    return (
      <OnceInput
        ref={ref}
        id={id}
        height={height ?? "m"}
        radius={radius}
        className={cn("w-full", className)}
        inputClassName={inputClassName}
        surfaceClassName={surfaceClassName}
        hasPrefix={leading}
        hasSuffix={trailing}
        {...rest}
      />
    );
  },
);

Input.displayName = "Input";

export { Input };
