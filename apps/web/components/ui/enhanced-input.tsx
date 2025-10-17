"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/utils";
import { AlertCircle, Check, Eye, EyeOff, Search, X } from "lucide-react";

interface EnhancedInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  description?: string;
  error?: string;
  success?: string;
  icon?: React.ReactNode;
  endIcon?: React.ReactNode;
  variant?: "default" | "glass" | "minimal";
  state?: "default" | "error" | "success" | "loading";
  showToggle?: boolean; // for password fields
  containerClassName?: string;
}

export const EnhancedInput = React.forwardRef<
  HTMLInputElement,
  EnhancedInputProps
>(
  ({
    className,
    label,
    description,
    error,
    success,
    icon,
    endIcon,
    variant = "default",
    state = "default",
    showToggle = false,
    containerClassName,
    type,
    ...props
  }, ref) => {
    const { height: _ignoredHeight, ...inputProps } = props;
    const [showPassword, setShowPassword] = React.useState(false);
    const [isFocused, setIsFocused] = React.useState(false);

    const isPassword = type === "password";
    const inputType = isPassword && showPassword ? "text" : type;

    const variantSurfaceStyles: Record<typeof variant, string> = {
      default: "border border-input bg-background",
      glass: "border border-white/20 bg-white/10 backdrop-blur-md",
      minimal: "border-b-2 border-input rounded-none bg-transparent",
    };

    const stateSurfaceStyles: Record<typeof state, string> = {
      default: "",
      error: "border-destructive", // rely on Tailwind palette
      success: "border-success",
      loading: "border-primary/60",
    };

    const getStateIcon = () => {
      switch (state) {
        case "error":
          return <AlertCircle className="h-4 w-4 text-destructive" />;
        case "success":
          return <Check className="h-4 w-4 text-success" />;
        case "loading":
          return (
            <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          );
        default:
          return endIcon;
      }
    };

    return (
      <motion.div
        className={cn("space-y-2", containerClassName)}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {label && (
          <motion.div
            animate={{
              scale: isFocused ? 1.02 : 1,
              color: state === "error"
                ? "hsl(var(--destructive))"
                : state === "success"
                ? "hsl(var(--success))"
                : isFocused
                ? "hsl(var(--primary))"
                : "hsl(var(--foreground))",
            }}
            transition={{ duration: 0.2 }}
          >
            <Label htmlFor={inputProps.id} className="text-sm font-medium">
              {label}
            </Label>
          </motion.div>
        )}

        <Input
          ref={ref}
          type={inputType}
          inputClassName={cn(
            "touch-target transition-all duration-200 min-h-[44px] sm:min-h-[40px]",
            icon && "pl-10",
            (getStateIcon() || isPassword) && "pr-12",
            className,
          )}
          surfaceClassName={cn(
            "transition-colors duration-200",
            variantSurfaceStyles[variant],
            stateSurfaceStyles[state],
            isFocused && "ring-2 ring-primary/20",
          )}
          leading={icon
            ? <span className="text-muted-foreground">{icon}</span>
            : undefined}
          trailing={(getStateIcon() || (isPassword && showToggle))
            ? (
              <div className="flex items-center gap-2">
                {getStateIcon()}
                {isPassword && showToggle && (
                  <motion.button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="touch-target rounded p-1 text-muted-foreground hover:text-foreground transition-colors"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    {showPassword
                      ? <EyeOff className="h-4 w-4" />
                      : <Eye className="h-4 w-4" />}
                  </motion.button>
                )}
              </div>
            )
            : undefined}
          onFocus={(e) => {
            setIsFocused(true);
            inputProps.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            inputProps.onBlur?.(e);
          }}
          {...inputProps}
        />

        {(description || error || success) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            transition={{ duration: 0.2 }}
            className="space-y-1"
          >
            {description && !error && !success && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
            {error && (
              <motion.p
                className="text-xs text-destructive flex items-center gap-1"
                initial={{ x: -5 }}
                animate={{ x: 0 }}
              >
                <AlertCircle className="h-3 w-3" />
                {error}
              </motion.p>
            )}
            {success && (
              <motion.p
                className="text-xs text-success flex items-center gap-1"
                initial={{ x: -5 }}
                animate={{ x: 0 }}
              >
                <Check className="h-3 w-3" />
                {success}
              </motion.p>
            )}
          </motion.div>
        )}
      </motion.div>
    );
  },
);

EnhancedInput.displayName = "EnhancedInput";
