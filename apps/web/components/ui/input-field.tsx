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

const inputPadding = cva("min-h-[44px] transition-all duration-200", {
  variants: {
    size: {
      sm: "text-sm",
      md: "text-base",
      lg: "text-lg",
    },
    hasStartIcon: {
      true: "pl-10",
      false: "",
    },
    hasEndContent: {
      true: "pr-4",
      false: "",
    },
  },
  defaultVariants: {
    size: "md",
    hasStartIcon: false,
    hasEndContent: false,
  },
});

export interface InputFieldProps extends
  Omit<
    React.ComponentProps<typeof Input>,
    "className" | "size" | "leading" | "trailing" | "inputClassName" | "error"
  >,
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
    id: providedId,
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
    const generatedId = React.useId();
    const fieldId = providedId ?? generatedId;

    const descriptionId = description && !error && !success
      ? `${fieldId}-description`
      : undefined;
    const errorId = error ? `${fieldId}-error` : undefined;
    const successId = success ? `${fieldId}-success` : undefined;
    const counterId = showCounter && maxLength
      ? `${fieldId}-counter`
      : undefined;
    const describedBy = [descriptionId, errorId, successId, counterId]
      .filter(Boolean)
      .join(" ") || undefined;

    React.useEffect(() => {
      if (typeof value === "string") {
        setCurrentLength(value.length);
      }
    }, [value]);

    const handleTogglePassword = () => {
      if (!showPasswordToggle) return;
      setShowPassword((previous) => !previous);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setCurrentLength(e.target.value.length);
      props.onChange?.(e);
    };

    return (
      <div className={cn(inputFieldVariants({ size, state }), className)}>
        {label && (
          <Label htmlFor={fieldId} className="mb-2 block">
            {label}
          </Label>
        )}

        <Input
          ref={ref}
          id={fieldId}
          type={type}
          value={value}
          maxLength={maxLength}
          aria-invalid={state === "error"}
          aria-describedby={describedBy}
          height={size === "sm" ? "s" : "m"}
          inputClassName={cn(
            inputPadding({
              size,
              hasStartIcon: !!startIcon,
              hasEndContent: Boolean(actualEndIcon || showPasswordToggle),
            }),
            inputClassName,
          )}
          leading={startIcon
            ? (
              <Icon
                name={startIcon}
                className="h-4 w-4 text-muted-foreground"
                aria-hidden="true"
              />
            )
            : undefined}
          trailing={(actualEndIcon || showPasswordToggle)
            ? (
              <div className="flex items-center gap-2">
                {actualEndIcon && !showPasswordToggle && (
                  <Icon
                    name={actualEndIcon}
                    className="h-4 w-4 text-muted-foreground"
                    aria-hidden="true"
                  />
                )}
                {showPasswordToggle && (
                  <button
                    type="button"
                    onClick={handleTogglePassword}
                    className="rounded px-1 py-0.5 text-muted-foreground transition-colors hover:text-foreground"
                    aria-label={showPassword
                      ? "Hide password"
                      : "Show password"}
                    aria-pressed={showPassword}
                  >
                    <Icon
                      name={actualEndIcon ?? "Eye"}
                      className="h-4 w-4"
                      aria-hidden="true"
                    />
                  </button>
                )}
              </div>
            )
            : undefined}
          error={state === "error"}
          onChange={handleChange}
          {...props}
        />

        {description && !error && !success && (
          <p id={descriptionId} className="mt-1 text-sm text-muted-foreground">
            {description}
          </p>
        )}

        {error && (
          <p
            id={errorId}
            className="mt-1 text-sm text-destructive flex items-center gap-1"
            role="alert"
            aria-live="assertive"
          >
            <Icon name="AlertTriangle" className="h-3 w-3" aria-hidden="true" />
            {error}
          </p>
        )}

        {success && (
          <p
            id={successId}
            className="mt-1 text-sm text-green-600 dark:text-green-400 flex items-center gap-1"
            aria-live="polite"
          >
            <Icon name="Check" className="h-3 w-3" aria-hidden="true" />
            {success}
          </p>
        )}

        {showCounter && maxLength && (
          <p
            id={counterId}
            className="mt-1 text-xs text-muted-foreground text-right"
            aria-live="polite"
          >
            {currentLength}/{maxLength}
          </p>
        )}
      </div>
    );
  },
);

InputField.displayName = "InputField";

export { InputField };
