"use client";

import { useMemo } from "react";
import { Search } from "lucide-react";

import {
  Button as DynamicButton,
  Icon,
  Kbar,
  Row,
  Text,
} from "@/components/dynamic-ui-system";
import { cn } from "@/utils";
import { HEADER_SEARCH_ENTRIES } from "./nav-items";

interface HeaderSearchButtonProps {
  className?: string;
  size?: "s" | "m";
  variant?: "secondary" | "tertiary";
  fullWidth?: boolean;
  onOpen?: () => void;
}

export function HeaderSearchButton({
  className,
  size = "s",
  variant = "secondary",
  fullWidth = false,
  onOpen,
}: HeaderSearchButtonProps) {
  const items = useMemo(() => HEADER_SEARCH_ENTRIES, []);

  return (
    <Kbar items={items}>
      <DynamicButton
        type="button"
        size={size}
        variant={variant}
        className={cn(
          "group relative flex min-h-[44px] items-center justify-between gap-3 rounded-xl px-4 text-sm font-semibold normal-case tracking-[0.02em]",
          fullWidth ? "w-full" : undefined,
          className,
        )}
        aria-label="Search the Dynamic Capital desk"
        onClick={() => {
          onOpen?.();
        }}
      >
        <Row
          gap="8"
          className={cn("items-center", fullWidth ? "flex-1" : undefined)}
        >
          <Icon name="search" size="s" className="text-muted-foreground" />
          <Text as="span" variant="body-default-s" className="text-foreground">
            Search the desk
          </Text>
        </Row>
        <Row
          gap="4"
          className="hidden items-center rounded-lg border border-border/60 px-2 py-1 text-[11px] font-medium text-muted-foreground md:flex"
          aria-hidden
        >
          <Search className="h-3.5 w-3.5" />
          <span>⌘K</span>
        </Row>
      </DynamicButton>
    </Kbar>
  );
}

export default HeaderSearchButton;
