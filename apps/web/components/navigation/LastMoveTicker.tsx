"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { usePathname } from "next/navigation";

import {
  Button as DynamicButton,
  Card,
  Column,
  Heading,
  Row,
  Tag,
  Text,
} from "@/components/dynamic-ui-system";
import { findRouteByPath } from "@/config/route-registry";
import { cn } from "@/utils";

interface LastMoveState {
  path: string;
  timestamp: number;
}

interface LastMoveTickerProps {
  className?: string;
}

const STORAGE_KEY = "dynamic:last-move";

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  if (!Number.isFinite(timestamp) || timestamp <= 0 || timestamp > now) {
    return "just now";
  }

  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);

  if (seconds < 10) {
    return "just now";
  }

  if (seconds < 60) {
    return `${seconds}s ago`;
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function LastMoveTicker({ className }: LastMoveTickerProps) {
  const pathname = usePathname() ?? "/";
  const [lastMove, setLastMove] = useState<LastMoveState | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    let stored: LastMoveState | null = null;

    try {
      const raw = window.sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as LastMoveState;
        if (parsed?.path && parsed.path !== pathname) {
          stored = parsed;
        }
      }
    } catch {
      stored = null;
    }

    setLastMove(stored);

    const entry: LastMoveState = {
      path: pathname,
      timestamp: Date.now(),
    };

    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(entry));
    } catch {
      // Ignore write errors (e.g. private mode)
    }
  }, [pathname]);

  const route = useMemo(
    () => (lastMove ? findRouteByPath(lastMove.path) : undefined),
    [lastMove],
  );

  if (!lastMove || !route) {
    return null;
  }

  const tagList = route.tags.slice(0, 3);
  const relativeTime = formatRelativeTime(lastMove.timestamp);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={route.id}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className={cn(className)}
      >
        <Card
          padding="16"
          radius="xl"
          gap="12"
          className="border border-brand/40 bg-gradient-to-r from-brand/5 via-background to-background shadow-lg shadow-brand/10"
        >
          <Column gap="12">
            <Row
              gap="8"
              wrap
              vertical="center"
              className="w-full justify-between"
            >
              <Row gap="8" wrap vertical="center">
                <Tag
                  size="s"
                  background="brand-alpha-weak"
                  border="brand-alpha-medium"
                >
                  Last move
                </Tag>
                <Tag
                  size="s"
                  background="neutral-alpha-weak"
                  border="neutral-alpha-medium"
                >
                  {relativeTime}
                </Tag>
              </Row>
              <DynamicButton
                size="s"
                variant="secondary"
                href={route.path}
                suffixIcon="arrowUpRight"
              >
                Resume journey
              </DynamicButton>
            </Row>
            <Column gap="8">
              <Heading variant="heading-strong-xs">{route.label}</Heading>
              <Text variant="body-default-xs" onBackground="neutral-weak">
                {route.description}
              </Text>
            </Column>
            {tagList.length > 0
              ? (
                <Row gap="8" wrap>
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
                </Row>
              )
              : null}
          </Column>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}

export default LastMoveTicker;
