import "@testing-library/jest-dom/vitest";
import React from "react";
import { vi } from "vitest";

const createPrimitive = (tag: string) =>
  React.forwardRef<any, any>(({ children, ...props }, ref) =>
    React.createElement(tag, { ref, ...props }, children)
  );

vi.mock("framer-motion", () => {
  const motion = new Proxy(
    {},
    {
      get: (_target, key: string) => createPrimitive(key),
    },
  );

  return {
    AnimatePresence: ({ children }: { children: React.ReactNode }) => (
      <>{children}</>
    ),
    LayoutGroup: ({ children }: { children: React.ReactNode }) => (
      <>{children}</>
    ),
    motion,
  };
});

vi.mock("@/components/dynamic-ui", () => ({
  DynamicContainer: createPrimitive("div"),
  DynamicMotionStackItem: createPrimitive("div"),
}));

vi.mock("@/components/dynamic-ui-system", () => ({
  Badge: createPrimitive("span"),
  Button: createPrimitive("button"),
  Column: createPrimitive("div"),
  Heading: createPrimitive("h2"),
  Line: createPrimitive("div"),
  Input: createPrimitive("input"),
  Row: createPrimitive("div"),
  Spinner: () => <div data-testid="spinner" />,
  Tag: createPrimitive("span"),
  Text: createPrimitive("span"),
}));

vi.mock("next/font/google", () => {
  const createFont = (className: string) => () => ({
    className,
    style: { fontFamily: className },
    variable: `--${className}`,
  });

  return {
    Geist: createFont("geist"),
    Geist_Mono: createFont("geist-mono"),
  };
});

vi.mock("lucide-react", () => {
  const createIcon = (name: string) =>
  (
    { children, ...props }: React.SVGProps<SVGSVGElement>,
  ) => (
    <svg data-icon={name} {...props}>
      {children}
    </svg>
  );

  return {
    Activity: createIcon("Activity"),
    ArrowRight: createIcon("ArrowRight"),
    BellRing: createIcon("BellRing"),
    Bot: createIcon("Bot"),
    CandlestickChart: createIcon("CandlestickChart"),
    CheckCircle2: createIcon("CheckCircle2"),
    Clock: createIcon("Clock"),
    GraduationCap: createIcon("GraduationCap"),
    Home: createIcon("Home"),
    LineChart: createIcon("LineChart"),
    Loader2: createIcon("Loader2"),
    Minimize2: createIcon("Minimize2"),
    Radar: createIcon("Radar"),
    RefreshCw: createIcon("RefreshCw"),
    RotateCcw: createIcon("RotateCcw"),
    Sparkles: createIcon("Sparkles"),
    Wallet: createIcon("Wallet"),
    WifiOff: createIcon("WifiOff"),
    X: createIcon("X"),
    Zap: createIcon("Zap"),
  };
});
