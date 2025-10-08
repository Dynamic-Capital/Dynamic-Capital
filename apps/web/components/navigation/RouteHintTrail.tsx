"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";

import { Tag, Text } from "@/components/dynamic-ui-system";
import { findRouteByPath } from "@/config/route-registry";
import { cn } from "@/utils";

interface RouteHintTrailProps {
  className?: string;
}

export function RouteHintTrail({ className }: RouteHintTrailProps) {
  const pathname = usePathname() ?? "/";
  const route = useMemo(() => findRouteByPath(pathname), [pathname]);

  if (!route?.hint) {
    return null;
  }

  const displayedTags = route.tags.slice(0, 3);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={route.id}
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className={cn(
          "border-t border-border/40 bg-background/70 backdrop-blur",
          className,
        )}
        aria-live="polite"
        aria-atomic="true"
      >
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-2">
          <div className="flex flex-wrap items-center gap-2">
            <Tag
              size="s"
              background="brand-alpha-weak"
              border="brand-alpha-medium"
              className="uppercase tracking-[0.24em] text-[11px]"
            >
              {route.hint.title}
            </Tag>
            {displayedTags.map((tag) => (
              <Tag
                key={tag}
                size="s"
                background="neutral-alpha-weak"
                border="neutral-alpha-medium"
              >
                {tag}
              </Tag>
            ))}
          </div>
          <Text
            variant="body-default-xs"
            onBackground="neutral-weak"
            className="max-w-xl text-right"
          >
            {route.hint.description}
          </Text>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export default RouteHintTrail;
