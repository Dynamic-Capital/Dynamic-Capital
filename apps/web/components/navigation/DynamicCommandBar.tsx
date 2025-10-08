"use client";

import Link from "next/link";
import { useMemo } from "react";
import { motion } from "framer-motion";

import { Tag, Text } from "@/components/dynamic-ui-system";
import { Button } from "@/components/ui/button";
import {
  type CommandBarItem,
  type CommandBarMeta,
  getCommandBarItems,
} from "@/config/route-registry";
import { cn } from "@/utils";

interface DynamicCommandBarProps {
  group?: CommandBarMeta["group"];
  className?: string;
}

const EMPHASIS_VARIANTS: Record<CommandBarItem["emphasis"], string> = {
  brand: "border-brand/40 bg-brand/10",
  accent: "border-accent/40 bg-accent/10",
  neutral: "border-border/50 bg-card/60",
};

export function DynamicCommandBar({
  group = "dynamic-services",
  className,
}: DynamicCommandBarProps) {
  const items = useMemo(() => getCommandBarItems(group), [group]);

  if (items.length === 0) {
    return null;
  }

  return (
    <motion.div
      className={cn(
        "grid gap-3 rounded-3xl border border-border/40 bg-background/80 p-4 shadow-lg shadow-primary/5 backdrop-blur",
        "sm:grid-cols-2 lg:grid-cols-3",
        className,
      )}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      {items.map((item) => {
        const Icon = item.icon;
        const emphasisClass = EMPHASIS_VARIANTS[item.emphasis] ??
          EMPHASIS_VARIANTS.neutral;
        const tagList = item.tags.slice(0, 3);

        return (
          <motion.div
            key={item.id}
            className={cn(
              "group relative flex flex-col gap-3 overflow-hidden rounded-2xl border px-4 py-4 transition",
              emphasisClass,
            )}
            whileHover={{ y: -4 }}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {Icon
                  ? (
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-background/60 text-foreground/90">
                      <Icon className="h-4 w-4" aria-hidden />
                    </span>
                  )
                  : null}
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-foreground">
                    {item.label}
                  </span>
                  <Text variant="body-default-xs" onBackground="neutral-weak">
                    {item.hint.title}
                  </Text>
                </div>
              </div>
              <Button
                asChild
                size="sm"
                variant="ghost"
                className="translate-y-0 group-hover:translate-y-0"
              >
                <Link href={item.href}>Open</Link>
              </Button>
            </div>
            <Text variant="body-default-xs" onBackground="neutral-weak">
              {item.description}
            </Text>
            <div className="flex flex-wrap gap-2">
              {tagList.map((tag) => (
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
          </motion.div>
        );
      })}
    </motion.div>
  );
}

export default DynamicCommandBar;
