"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Input } from "./input";
import { Label } from "./label";
import { Icon, IconName } from "./icon";
import { cn } from "@/utils";

const inputFieldVariants = cva("", {
  variants: {
    size: {
      sm: "text-sm",
      md: "text-base",
      lg: "text-lg",
    },
    state: {
      default: "",
      error: "text-destructive",
      success: "text-green-600 dark:text-green-400",
    },
  },
  defaultVariants: {
    size: "md",
    state: "default",
  },
});

const inputVariants = cva(
  "flex h-10 w-full rounded-md border bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm transition-colors",
  {
    variants: {
      state: {
        default: "border-input",
        error: "border-destructive focus-visible:ring-destructive",
        success: "border-green-500 focus-visible:ring-green-500",
      },
      hasStartIcon: {
        true: "pl-10",
        false: "",
      },
      hasEndIcon: {
        true: "pr-10",
        false: "",
      },
    },
    defaultVariants: {
      state: "default",
      hasStartIcon: false,
      hasEndIcon: false,
    },
  },
);

export interface InputFieldProps
  extends
    Omit<React.ComponentProps<typeof Input>, "className" | "size">,
    VariantProps<typeof inputFieldVariants> {
  label?: string;
  description?: string;
  error?: string;
  success?: string;
  startIcon?: IconName;
  endIcon?: IconName;
  showPasswordToggle?: boolean;
  maxLength?: number;
  showCounter?: boolean;
  className?: string;
  inputClassName?: string;
}

const InputField = React.forwardRef<HTMLInputElement, InputFieldProps>(
  ({
    label,
    description,
    error,
    success,
    startIcon,
    endIcon,
    showPasswordToggle,
    maxLength,
    showCounter,
    size,
    state: propState,
    className,
    inputClassName,
    type: propType,
    value,
    ...props
  }, ref) => {
    const [showPassword, setShowPassword] = React.useState(false);
    const [currentLength, setCurrentLength] = React.useState(0);

    const state = error
      ? "error"
      : success
      ? "success"
      : propState || "default";
    const type = showPasswordToggle && showPassword ? "text" : propType;
    const actualEndIcon = showPasswordToggle
      ? (showPassword ? "EyeOff" : "Eye")
      : endIcon;

    React.useEffect(() => {
      if (typeof value === "string") {
        setCurrentLength(value.length);
      }
    }, [value]);

    const handleEndIconClick = () => {
      if (showPasswordToggle) {
        setShowPassword(!showPassword);
      }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setCurrentLength(e.target.value.length);
      props.onChange?.(e);
    };

    return (
      <div className={cn(inputFieldVariants({ size, state }), className)}>
        {label && (
          <Label htmlFor={props.id} className="mb-2 block">
            {label}
          </Label>
        )}

        <div className="relative">
          {startIcon && (
            <Icon
              name={startIcon}
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            />
          )}

          <Input
            ref={ref}
            type={type}
            value={value}
            maxLength={maxLength}
            className={cn(
              inputVariants({
                state,
                hasStartIcon: !!startIcon,
                hasEndIcon: !!actualEndIcon,
              }),
              inputClassName,
            )}
            onChange={handleChange}
            {...props}
          />

          {actualEndIcon && (
            <button
              type="button"
              onClick={handleEndIconClick}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <Icon name={actualEndIcon} className="h-4 w-4" />
            </button>
          )}
        </div>

        {description && !error && !success && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}

        {error && (
          <p className="mt-1 text-sm text-destructive flex items-center gap-1">
            <Icon name="Triangle" className="h-3 w-3" />
            {error}
          </p>
        )}

        {success && (
          <p className="mt-1 text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
            <Icon name="Check" className="h-3 w-3" />
            {success}
          </p>
        )}

        {showCounter && maxLength && (
          <p className="mt-1 text-xs text-muted-foreground text-right">
            {currentLength}/{maxLength}
          </p>
        )}
      </div>
    );
  },
);

InputField.displayName = "InputField";

export { InputField };
