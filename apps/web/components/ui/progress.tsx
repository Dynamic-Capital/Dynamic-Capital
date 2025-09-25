"use client";

import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";
import { Check } from "lucide-react";

import { cn } from "@/utils";

export type StepState = "complete" | "current" | "upcoming";

export interface ProgressProps
  extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> {
  /**
   * Optional label rendered above the progress track.
   * Defaults to "Progress" when `showLabel` is true without a provided value.
   */
  label?: string;
  /**
   * Toggles whether the label should be visible.
   * Defaults to true when a `label` is provided.
   */
  showLabel?: boolean;
  /**
   * Displays the formatted value on the right side of the label row.
   */
  showValue?: boolean;
  /**
   * Custom formatter for the displayed value. Receives the progress percentage (0-100).
   */
  formatValue?: (percentage: number) => string;
  /**
   * Additional class name for the wrapper element surrounding the Radix root.
   */
  wrapperClassName?: string;
  /**
   * Additional class name for the indicator element.
   */
  indicatorClassName?: string;
}

export const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  ProgressProps
>(
  (
    {
      className,
      wrapperClassName,
      indicatorClassName,
      label,
      showLabel = Boolean(label),
      showValue = true,
      formatValue = (percentage) => `${Math.round(percentage)}%`,
      value = 0,
      max = 100,
      ...props
    },
    ref,
  ) => {
    const safeMax = typeof max === "number" && max > 0 ? max : 100;
    const safeValue = Math.min(Math.max(value ?? 0, 0), safeMax);
    const percentage = safeMax === 0 ? 0 : (safeValue / safeMax) * 100;
    const displayValue = formatValue(percentage);

    return (
      <div className={cn("flex flex-col gap-2", wrapperClassName)}>
        {(showLabel || showValue) && (
          <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
            {showLabel && <span>{label ?? "Progress"}</span>}
            {showValue && (
              <span className="tabular-nums text-foreground">
                {displayValue}
              </span>
            )}
          </div>
        )}
        <ProgressPrimitive.Root
          ref={ref}
          className={cn(
            "relative h-2.5 w-full overflow-hidden rounded-full bg-muted",
            className,
          )}
          value={safeValue}
          max={safeMax}
          {...props}
        >
          <ProgressPrimitive.Indicator
            className={cn(
              "h-full w-full flex-1 rounded-full bg-gradient-brand transition-transform duration-500 ease-out",
              indicatorClassName,
            )}
            style={{ transform: `translateX(-${100 - percentage}%)` }}
          />
        </ProgressPrimitive.Root>
      </div>
    );
  },
);
Progress.displayName = "Progress";

export interface ProgressStep {
  /** Primary text describing the step. */
  title: string;
  /** Supporting detail shown beneath the title. */
  description?: string;
  /** Optional label rendered alongside the title (e.g. status text). */
  meta?: string;
  /** Explicit state override. When omitted the component infers the state using `currentStep`. */
  state?: StepState;
}

export interface MultiStepProgressProps {
  steps: ProgressStep[];
  /**
   * One-indexed current step used to infer state when a step omits its `state`.
   */
  currentStep?: number;
  /**
   * Layout direction for the stepper.
   */
  orientation?: "horizontal" | "vertical";
  /**
   * Container class name applied to the outer wrapper.
   */
  className?: string;
  /**
   * Optional heading shown above the stepper.
   */
  label?: string;
  /**
   * Optional summary displayed next to the heading. Defaults to "Step X of Y".
   */
  summary?: string;
  /**
   * Renders the step index inside the indicator when a step is not complete.
   */
  showStepNumber?: boolean;
}

const getStateForIndex = (
  step: ProgressStep,
  index: number,
  currentStep: number,
): StepState => {
  if (step.state) {
    return step.state;
  }

  if (index + 1 < currentStep) {
    return "complete";
  }

  if (index + 1 === currentStep) {
    return "current";
  }

  return "upcoming";
};

const indicatorClassesForState = (state: StepState) =>
  cn(
    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm font-semibold transition-all duration-200",
    {
      "border-transparent bg-gradient-brand text-white shadow-sm shadow-primary/30":
        state === "complete",
      "border-primary/60 bg-background text-primary shadow-sm shadow-primary/20":
        state === "current",
      "border-border bg-background text-muted-foreground": state === "upcoming",
    },
  );

const connectorClassNames = (
  active: boolean,
  orientation: "horizontal" | "vertical",
) =>
  orientation === "horizontal"
    ? cn(
      "sm:after:absolute sm:after:left-[calc(50%+1.75rem)] sm:after:top-[1.125rem] sm:after:h-0.5 sm:after:w-[calc(100%-3.5rem)] sm:after:bg-border/60 sm:after:content-['']",
      active && "sm:after:bg-gradient-brand",
    )
    : "";

export const MultiStepProgress: React.FC<MultiStepProgressProps> = ({
  steps,
  currentStep = 1,
  orientation = "horizontal",
  className,
  label,
  summary,
  showStepNumber = true,
}) => {
  const totalSteps = steps.length;
  const clampedCurrent = Math.min(Math.max(currentStep, 1), totalSteps || 1);
  const resolvedSummary = summary ??
    `Step ${clampedCurrent} of ${Math.max(totalSteps, 1)}`;

  return (
    <section
      className={cn(
        "flex w-full flex-col gap-6 rounded-2xl border border-border/60 bg-background/80 p-6 shadow-sm",
        className,
      )}
      aria-label={label ?? "Progress"}
    >
      <header className="flex flex-col gap-1">
        <span className="text-sm font-semibold text-foreground">
          {label ?? "Progress"}
        </span>
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {resolvedSummary}
        </span>
      </header>

      <ol
        className={cn(
          "flex gap-6",
          orientation === "horizontal"
            ? "flex-col sm:flex-row sm:items-start"
            : "flex-col",
        )}
      >
        {steps.map((step, index) => {
          const state = getStateForIndex(step, index, clampedCurrent);
          const isLast = index === totalSteps - 1;
          const indicatorClasses = indicatorClassesForState(state);
          const connectorActive = index + 1 < clampedCurrent;

          if (orientation === "vertical") {
            return (
              <li key={step.title} className="flex items-start gap-4">
                <div className="flex flex-col items-center">
                  <div className={indicatorClasses}>
                    {state === "complete"
                      ? <Check className="h-4 w-4" aria-hidden="true" />
                      : (
                        showStepNumber && <span>{index + 1}</span>
                      )}
                  </div>
                  {!isLast && (
                    <div
                      className={cn(
                        "mt-2 w-px flex-1 bg-border/60",
                        connectorActive && "bg-gradient-brand",
                      )}
                      aria-hidden="true"
                    />
                  )}
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-foreground">
                      {step.title}
                    </span>
                    {step.meta && (
                      <span className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
                        {step.meta}
                      </span>
                    )}
                  </div>
                  {step.description && (
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      {step.description}
                    </p>
                  )}
                </div>
              </li>
            );
          }

          return (
            <li
              key={step.title}
              className={cn(
                "relative flex flex-1 flex-col gap-3",
                !isLast && connectorClassNames(connectorActive, orientation),
              )}
            >
              <div className="flex items-start gap-3">
                <div className={indicatorClasses}>
                  {state === "complete"
                    ? <Check className="h-4 w-4" aria-hidden="true" />
                    : (
                      showStepNumber && <span>{index + 1}</span>
                    )}
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-foreground">
                      {step.title}
                    </span>
                    {step.meta && (
                      <span className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
                        {step.meta}
                      </span>
                    )}
                  </div>
                  {step.description && (
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      {step.description}
                    </p>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
};
