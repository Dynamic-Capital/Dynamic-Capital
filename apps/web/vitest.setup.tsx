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
  Input: createPrimitive("input"),
  Row: createPrimitive("div"),
  Spinner: () => <div data-testid="spinner" />,
  Text: createPrimitive("span"),
}));

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
    Bot: createIcon("Bot"),
    CheckCircle2: createIcon("CheckCircle2"),
    Loader2: createIcon("Loader2"),
    Minimize2: createIcon("Minimize2"),
    RotateCcw: createIcon("RotateCcw"),
    Sparkles: createIcon("Sparkles"),
    WifiOff: createIcon("WifiOff"),
    X: createIcon("X"),
  };
});
