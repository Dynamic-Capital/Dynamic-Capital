"use client";

import {
  type ComponentPropsWithoutRef,
  createContext,
  type ElementRef,
  forwardRef,
  type MutableRefObject,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";

import { cn } from "@/utils";
import { LayoutGroup, motion } from "framer-motion";

const TabsIndicatorContext = createContext(false);

const Tabs = TabsPrimitive.Root;

const TabsList = forwardRef<
  ElementRef<typeof TabsPrimitive.List>,
  ComponentPropsWithoutRef<typeof TabsPrimitive.List> & {
    orientation?: "horizontal" | "vertical";
    "aria-label"?: string;
    animateIndicator?: boolean;
  }
>(
  (
    {
      className,
      orientation = "horizontal",
      "aria-label": ariaLabel = "Tabs",
      animateIndicator = false,
      children,
      ...props
    },
    ref,
  ) => {
    const list = (
      <TabsIndicatorContext.Provider value={animateIndicator}>
        <TabsPrimitive.List
          ref={ref}
          className={cn(
            "inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground",
            animateIndicator && "relative",
            className,
          )}
          role="tablist"
          aria-orientation={orientation}
          aria-label={ariaLabel}
          {...props}
        >
          {children}
        </TabsPrimitive.List>
      </TabsIndicatorContext.Provider>
    );
    return animateIndicator ? <LayoutGroup>{list}</LayoutGroup> : list;
  },
);
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = forwardRef<
  ElementRef<typeof TabsPrimitive.Trigger>,
  ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, children, ...props }, ref) => {
  const animate = useContext(TabsIndicatorContext);
  const internalRef = useRef<HTMLButtonElement>(null);
  const combinedRef = (node: HTMLButtonElement | null) => {
    internalRef.current = node;
    if (typeof ref === "function") ref(node);
    else if (ref) {
      (ref as MutableRefObject<HTMLButtonElement | null>).current = node;
    }
  };

  const [isActive, setIsActive] = useState(false);
  useEffect(() => {
    const node = internalRef.current;
    if (!node) return;
    const observer = new MutationObserver(() => {
      setIsActive(node.getAttribute("data-state") === "active");
    });
    observer.observe(node, {
      attributes: true,
      attributeFilter: ["data-state"],
    });
    setIsActive(node.getAttribute("data-state") === "active");
    return () => observer.disconnect();
  }, []);

  return (
    <TabsPrimitive.Trigger
      ref={combinedRef}
      className={cn(
        "relative inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 text-muted-foreground data-[state=active]:text-foreground",
        className,
      )}
      {...props}
    >
      {animate && isActive && (
        <motion.div
          layoutId="tab-indicator"
          className="absolute inset-0 rounded-sm bg-background shadow-sm"
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        />
      )}
      <span className="relative z-10">{children}</span>
    </TabsPrimitive.Trigger>
  );
});
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = forwardRef<
  ElementRef<typeof TabsPrimitive.Content>,
  ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      className,
    )}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsContent, TabsList, TabsTrigger };
