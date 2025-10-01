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
    const [showPassword, setShowPassword] = React.useState(false);
    const [isFocused, setIsFocused] = React.useState(false);

    const isPassword = type === "password";
    const inputType = isPassword && showPassword ? "text" : type;

    const variantStyles = {
      default: "border-input bg-background",
      glass: "bg-white/10 backdrop-blur-md border-white/20",
      minimal: "border-0 border-b-2 rounded-none bg-transparent",
    };

    const stateStyles = {
      default: "",
      error: "border-destructive focus:border-destructive",
      success: "border-success focus:border-success",
      loading: "animate-pulse",
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
            <Label htmlFor={props.id} className="text-sm font-medium">
              {label}
            </Label>
          </motion.div>
        )}

        <div className="relative">
          <div className="relative flex items-center">
            {icon && (
              <motion.div
                className="absolute left-3 z-10"
                animate={{
                  scale: isFocused ? 1.1 : 1,
                  color: state === "error"
                    ? "hsl(var(--destructive))"
                    : state === "success"
                    ? "hsl(var(--success))"
                    : isFocused
                    ? "hsl(var(--primary))"
                    : "hsl(var(--muted-foreground))",
                }}
                transition={{ duration: 0.2 }}
              >
                {icon}
              </motion.div>
            )}

            <Input
              ref={ref}
              type={inputType}
              className={cn(
                "touch-target transition-all duration-200",
                "min-h-[44px] sm:min-h-[40px]", // iOS accessibility
                "focus:ring-2 focus:ring-primary/20",
                variantStyles[variant],
                stateStyles[state],
                icon && "pl-10",
                (getStateIcon() || isPassword) && "pr-10",
                className,
              )}
              onFocus={(e) => {
                setIsFocused(true);
                props.onFocus?.(e);
              }}
              onBlur={(e) => {
                setIsFocused(false);
                props.onBlur?.(e);
              }}
              {...props}
            />

            <div className="absolute right-3 flex items-center gap-2">
              {getStateIcon()}

              {isPassword && showToggle && (
                <motion.button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="touch-target p-1 hover:bg-accent rounded transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  {showPassword
                    ? <EyeOff className="h-4 w-4 text-muted-foreground" />
                    : <Eye className="h-4 w-4 text-muted-foreground" />}
                </motion.button>
              )}
            </div>
          </div>
        </div>

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
