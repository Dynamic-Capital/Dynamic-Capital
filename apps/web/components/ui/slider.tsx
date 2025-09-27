"use client";

import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { cn } from "@/utils";

export interface SliderProps
  extends React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> {
  showTooltip?: boolean;
  formatValue?: (value: number) => string;
}

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  SliderProps
>(({ className, showTooltip = true, formatValue, ...props }, ref) => {
  const [isPointerDown, setIsPointerDown] = React.useState(false);
  const [isFocused, setIsFocused] = React.useState(false);

  const currentValue = props.value?.[0] ?? props.defaultValue?.[0] ?? 0;
  const min = props.min ?? 0;
  const max = props.max ?? 100;
  const percentage = ((currentValue - min) / (max - min)) * 100;

  const displayValue = formatValue
    ? formatValue(currentValue)
    : currentValue.toString();
  const showValueBubble = showTooltip && (isPointerDown || isFocused);

  return (
    <div className="relative w-full">
      <SliderPrimitive.Root
        ref={ref}
        className={cn(
          "relative flex w-full touch-none select-none items-center py-4",
          className,
        )}
        onPointerDown={() => setIsPointerDown(true)}
        onPointerUp={() => setIsPointerDown(false)}
        {...props}
      >
        <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-secondary">
          <SliderPrimitive.Range className="absolute h-full bg-primary transition-all" />
        </SliderPrimitive.Track>

        <SliderPrimitive.Thumb
          className="block h-5 w-5 rounded-full border-2 border-primary bg-background ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:scale-110 active:scale-95"
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />

        {showValueBubble && (
          <div
            className="absolute -top-12 transform -translate-x-1/2 transition-all duration-200 animate-scale-in"
            style={{ left: `${percentage}%` }}
          >
            <div className="bg-popover text-popover-foreground px-2 py-1 rounded-md text-sm font-medium shadow-md border">
              {displayValue}
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-popover">
              </div>
            </div>
          </div>
        )}
      </SliderPrimitive.Root>
    </div>
  );
});

Slider.displayName = "Slider";

export { Slider };
