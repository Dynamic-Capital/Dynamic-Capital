"use client";

import {
  type ComponentPropsWithoutRef,
  forwardRef,
  type ReactNode,
  useId,
  useMemo,
} from "react";

import { Select as OnceSelect } from "@/components/dynamic-ui-system";
import { cn } from "@/utils";

type OnceSelectProps = ComponentPropsWithoutRef<typeof OnceSelect>;

type BaseOption = {
  value: string;
  label: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  leading?: ReactNode;
  trailing?: ReactNode;
  disabled?: boolean;
  danger?: boolean;
};

export type SelectOption = BaseOption;

interface SelectProps extends
  Omit<
    OnceSelectProps,
    | "options"
    | "value"
    | "onSelect"
    | "className"
    | "hasPrefix"
    | "hasSuffix"
    | "surfaceClassName"
    | "inputClassName"
    | "prefix"
    | "suffix"
    | "id"
  > {
  id?: string;
  className?: string;
  inputClassName?: string;
  surfaceClassName?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  options: SelectOption[];
  value?: string | string[];
  onValueChange?: (value: string | string[]) => void;
  multiple?: boolean;
}

const Select = forwardRef<HTMLDivElement, SelectProps>(
  (
    {
      id,
      className,
      inputClassName,
      surfaceClassName,
      leading,
      trailing,
      options,
      value,
      onValueChange,
      multiple = false,
      fillWidth = true,
      ...rest
    },
    ref,
  ) => {
    const generatedId = useId();
    const normalizedValue = useMemo(() => {
      if (multiple) {
        if (Array.isArray(value)) {
          return value;
        }
        return value ? [value] : [];
      }
      return Array.isArray(value) ? value[0] ?? "" : value ?? "";
    }, [multiple, value]);

    const mappedOptions = useMemo(
      () =>
        options.map((option) => ({
          value: option.value,
          label: option.label,
          description: option.description,
          hasPrefix: option.icon ?? option.leading,
          hasSuffix: option.trailing,
          disabled: option.disabled,
          danger: option.danger,
        })),
      [options],
    );

    const handleSelect = (selected: unknown) => {
      if (multiple) {
        const nextValue = Array.isArray(selected)
          ? (selected as string[])
          : selected
          ? [selected as string]
          : [];
        onValueChange?.(nextValue);
        return;
      }

      if (Array.isArray(selected)) {
        onValueChange?.(selected[0] ?? "");
      } else {
        onValueChange?.((selected as string) ?? "");
      }
    };

    return (
      <OnceSelect
        ref={ref}
        id={id ?? generatedId}
        options={mappedOptions}
        value={normalizedValue}
        onSelect={handleSelect}
        multiple={multiple}
        fillWidth={fillWidth}
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

Select.displayName = "Select";

export { Select };
