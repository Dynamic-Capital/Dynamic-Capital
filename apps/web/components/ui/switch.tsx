"use client";

import {
  type ChangeEvent,
  forwardRef,
  type InputHTMLAttributes,
  useId,
} from "react";
import { motion } from "framer-motion";

import { cn } from "@/utils";

type BaseInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "onChange" | "checked"
>;

interface SwitchProps extends BaseInputProps {
  checked: boolean;
  onCheckedChange?: (checked: boolean) => void;
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
}

const Switch = forwardRef<HTMLInputElement, SwitchProps>(
  (
    {
      className,
      checked,
      disabled,
      id,
      onCheckedChange,
      onChange,
      ...props
    },
    ref,
  ) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;

    const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
      if (disabled) {
        event.preventDefault();
        return;
      }

      onCheckedChange?.(event.target.checked);
      onChange?.(event);
    };

    return (
      <label
        htmlFor={inputId}
        className={cn(
          "relative inline-flex h-7 w-[60px] cursor-pointer items-center rounded-full border border-transparent px-1 shadow-[inset_0px_0px_12px_rgba(0,0,0,0.25)] transition duration-200 focus-within:outline-none focus-within:ring-2 focus-within:ring-cyan-200 focus-within:ring-offset-2 focus-within:ring-offset-background",
          checked ? "bg-cyan-500" : "bg-slate-700 border-slate-500",
          disabled && "cursor-not-allowed opacity-60",
          className,
        )}
        data-disabled={disabled || undefined}
      >
        <motion.div
          key={String(checked)}
          initial={{ width: 20, x: checked ? 32 : 0 }}
          animate={{
            height: [20, 10, 20],
            width: [20, 30, 20, 20],
            x: checked ? 32 : 0,
          }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="block h-[20px] rounded-full bg-white shadow-md"
          aria-hidden="true"
        />
        <input
          id={inputId}
          ref={ref}
          type="checkbox"
          role="switch"
          aria-checked={checked}
          className="sr-only"
          checked={checked}
          disabled={disabled}
          onChange={handleChange}
          {...props}
        />
      </label>
    );
  },
);

Switch.displayName = "Switch";

export { Switch };
