"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronRight } from "lucide-react";

import {
  Button as DynamicButton,
  Card,
  Column,
  Heading,
  Icon,
  Input as DynamicInput,
  Row,
  Scroller,
  SmartLink,
  Tag,
  Text,
} from "@/components/dynamic-ui-system";
import {
  ROUTE_CATEGORY_STYLES,
  type RouteCategoryId,
} from "@/config/route-registry";
import { cn } from "@/utils";

import type { NavItem } from "../nav-items";

type FilterCategoryId = "all" | RouteCategoryId;

interface FilterCategoryOption {
  id: FilterCategoryId;
  label: string;
  count: number;
}

interface EnhancedNavItem extends NavItem {
  href: string;
  isActive: boolean;
}

const CATEGORY_ORDER: FilterCategoryId[] = [
  "all",
  "foundations",
  "products",
  "insights",
  "operations",
  "community",
];

const isNavItemActive = (
  item: NavItem,
  pathname: string,
  hash: string,
): boolean => {
  if (item.href?.startsWith("/#")) {
    const target = item.href.split("#")[1] ?? "";
    if (pathname !== "/") {
      return false;
    }
    if (target === "overview") {
      return hash === "" || hash === "#overview";
    }
    return hash === `#${target}`;
  }

  if (item.path === "/") {
    return pathname === "/";
  }

  return pathname.startsWith(item.path);
};

export interface FilterComponentProps {
  items: NavItem[];
  className?: string;
  title?: string;
  description?: string;
  onItemSelect?: (item: NavItem) => void;
}

const RESET_LABEL = "Reset filters";

const defaultTitle = "Navigate anywhere faster";
const defaultDescription =
  "Search every Dynamic Capital surface and jump to the experience you need.";

const NAVIGATION_BG =
  "shadow-[0_24px_60px_-30px_rgba(15,23,42,0.75)] backdrop-blur-xl";

const ACTIVE_CARD_STYLES =
  "border-primary/60 bg-primary/10 shadow-[0_24px_80px_-40px_hsl(var(--primary)_/_0.45)]";
const INACTIVE_CARD_STYLES =
  "border-border/40 bg-background/70 hover:border-primary/40 hover:bg-background/80";

const ACTIVE_CATEGORY_TAG = "border-transparent bg-primary/20 text-primary";
const INACTIVE_CATEGORY_TAG =
  "border-border/60 text-muted-foreground hover:border-primary/40 hover:text-foreground";

const EMPTY_CARD_STYLES = "border-dashed border-border/70 bg-background/60";

export const FilterComponent: React.FC<FilterComponentProps> = ({
  items,
  className,
  title = defaultTitle,
  description = defaultDescription,
  onItemSelect,
}) => {
  const pathname = usePathname() ?? "/";
  const shouldReduceMotion = useReducedMotion();
  const [hash, setHash] = useState<string>("");
  const [query, setQuery] = useState<string>("");
  const [activeCategory, setActiveCategory] = useState<FilterCategoryId>("all");
  const searchInputId = useId();

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const updateHash = () => {
      setHash(window.location.hash ?? "");
    };

    updateHash();
    window.addEventListener("hashchange", updateHash);

    return () => {
      window.removeEventListener("hashchange", updateHash);
    };
  }, [pathname]);

  const enhancedItems = useMemo<EnhancedNavItem[]>(() => {
    return items.map((item) => {
      const href = item.href ?? item.path;

      return {
        ...item,
        href,
        isActive: isNavItemActive(item, pathname, hash),
      } satisfies EnhancedNavItem;
    });
  }, [hash, items, pathname]);

  const categories = useMemo<FilterCategoryOption[]>(() => {
    const counts = enhancedItems.reduce<Record<RouteCategoryId, number>>(
      (accumulator, item) => {
        accumulator[item.categoryId] = (accumulator[item.categoryId] ?? 0) + 1;
        return accumulator;
      },
      {
        foundations: 0,
        products: 0,
        insights: 0,
        operations: 0,
        community: 0,
      },
    );

    return CATEGORY_ORDER.map((categoryId) => {
      if (categoryId === "all") {
        return {
          id: "all",
          label: "All experiences",
          count: enhancedItems.length,
        } satisfies FilterCategoryOption;
      }

      const config = ROUTE_CATEGORY_STYLES[categoryId];
      const count = counts[categoryId];

      if (count === 0) {
        return null;
      }

      return {
        id: categoryId,
        label: config.label,
        count,
      } satisfies FilterCategoryOption;
    }).filter((category): category is FilterCategoryOption =>
      Boolean(category)
    );
  }, [enhancedItems]);

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return enhancedItems.filter((item) => {
      const matchesCategory = activeCategory === "all" ||
        item.categoryId === activeCategory;

      if (!matchesCategory) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      return [
        item.label,
        item.description,
        item.step,
        item.categoryLabel,
      ]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(normalizedQuery));
    });
  }, [activeCategory, enhancedItems, query]);

  const hasActiveFilters = activeCategory !== "all" || query.trim().length > 0;

  const handleReset = () => {
    setActiveCategory("all");
    setQuery("");
  };

  const resultLabel = filteredItems.length === 1 ? "experience" : "experiences";

  return (
    <motion.section
      layout
      initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: shouldReduceMotion ? 0 : 0.35,
        ease: "easeOut",
      }}
      className={cn(
        "flex h-full flex-col gap-5 rounded-3xl border border-border/50 bg-background/95 p-6",
        NAVIGATION_BG,
        className,
      )}
    >
      <Column gap="20">
        <Column gap="16">
          <Row
            vertical="start"
            horizontal="between"
            wrap
            gap="12"
            className="gap-y-6"
          >
            <Column gap="8" maxWidth={72}>
              <Row gap="8" vertical="center">
                <Icon name="sparkle" size="s" aria-hidden />
                <Text
                  as="span"
                  variant="label-default-xs"
                  className="uppercase tracking-[0.28em] text-muted-foreground"
                >
                  Filter navigation
                </Text>
              </Row>
              <Heading variant="heading-strong-m">{title}</Heading>
              {description
                ? (
                  <Text
                    variant="body-default-s"
                    onBackground="neutral-weak"
                  >
                    {description}
                  </Text>
                )
                : null}
            </Column>
            <DynamicButton
              variant="tertiary"
              size="s"
              onClick={handleReset}
              disabled={!hasActiveFilters}
              aria-label={RESET_LABEL}
            >
              {RESET_LABEL}
            </DynamicButton>
          </Row>

          <Column gap="12">
            <DynamicInput
              id={searchInputId}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search desks, products, or workflows"
              aria-label="Search navigation entries"
              hasPrefix={<Icon name="search" size="s" aria-hidden />}
              height="m"
            />
            <Row gap="8" wrap>
              {categories.map((category) => {
                const isActive = activeCategory === category.id;

                return (
                  <DynamicButton
                    key={category.id}
                    size="s"
                    variant={isActive ? "primary" : "tertiary"}
                    onClick={() => setActiveCategory(category.id)}
                    aria-pressed={isActive}
                    className={cn(
                      "rounded-full px-4 py-1",
                      isActive ? ACTIVE_CATEGORY_TAG : INACTIVE_CATEGORY_TAG,
                    )}
                  >
                    <Row gap="8" vertical="center">
                      <Text as="span" variant="label-default-xs">
                        {category.label}
                      </Text>
                      <Tag
                        size="s"
                        variant="neutral"
                        className="px-2 py-0 text-[10px] font-medium"
                      >
                        {category.count}
                      </Tag>
                    </Row>
                  </DynamicButton>
                );
              })}
            </Row>
          </Column>
        </Column>

        <div className="flex-1">
          <Scroller direction="column" className="h-full gap-4 pr-2">
            <AnimatePresence initial={false}>
              {filteredItems.map((item) => {
                const IconComponent = item.icon;
                const categoryStyles = ROUTE_CATEGORY_STYLES[item.categoryId];

                return (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: shouldReduceMotion ? 0 : -12 }}
                    transition={{
                      duration: shouldReduceMotion ? 0 : 0.2,
                      ease: "easeOut",
                    }}
                  >
                    <SmartLink
                      href={item.href}
                      unstyled
                      className="group block"
                      onClick={() => onItemSelect?.(item)}
                      aria-label={`${item.label}. ${item.description}`}
                    >
                      <Card
                        radius="xl"
                        padding="16"
                        gap="16"
                        className={cn(
                          "w-full items-start transition-all",
                          item.isActive
                            ? ACTIVE_CARD_STYLES
                            : INACTIVE_CARD_STYLES,
                        )}
                      >
                        <Row gap="16" className="w-full" vertical="start">
                          <span
                            className={cn(
                              "flex h-11 w-11 items-center justify-center rounded-full text-foreground/90 transition",
                              item.isActive
                                ? "bg-primary/20 text-primary"
                                : "bg-muted text-muted-foreground",
                            )}
                            aria-hidden
                          >
                            {IconComponent
                              ? <IconComponent className="h-5 w-5" />
                              : <Icon name="sparkle" size="s" />}
                          </span>
                          <Column gap="8" className="flex-1 text-left">
                            <Row gap="8" wrap className="items-center">
                              <Heading variant="heading-strong-xs">
                                {item.label}
                              </Heading>
                              <Tag
                                size="s"
                                className={cn(
                                  "border px-2 py-0 text-[11px] font-semibold uppercase tracking-wide",
                                  categoryStyles.badgeClass,
                                )}
                              >
                                <span
                                  className={cn(
                                    "mr-1 inline-block h-1.5 w-1.5 rounded-full",
                                    categoryStyles.indicatorClass,
                                  )}
                                  aria-hidden
                                />
                                {categoryStyles.label}
                              </Tag>
                              {item.isActive
                                ? (
                                  <Tag
                                    size="s"
                                    variant="gradient"
                                    className="px-2 py-0 text-[11px] font-semibold uppercase tracking-wide"
                                  >
                                    Active
                                  </Tag>
                                )
                                : null}
                            </Row>
                            <Text
                              variant="body-default-s"
                              onBackground="neutral-weak"
                            >
                              {item.description}
                            </Text>
                            {item.step
                              ? (
                                <Text
                                  variant="label-default-xs"
                                  className="uppercase tracking-[0.28em] text-muted-foreground/80"
                                >
                                  {item.step}
                                </Text>
                              )
                              : null}
                          </Column>
                          <ChevronRight
                            className="mt-1 h-4 w-4 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-foreground"
                            aria-hidden
                          />
                        </Row>
                      </Card>
                    </SmartLink>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {filteredItems.length === 0 && (
              <motion.div
                key="filter-empty"
                initial={{ opacity: 0, scale: shouldReduceMotion ? 1 : 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: shouldReduceMotion ? 1 : 0.98 }}
                transition={{ duration: shouldReduceMotion ? 0 : 0.2 }}
              >
                <Card
                  radius="xl"
                  padding="20"
                  gap="12"
                  className={cn(
                    "h-44 items-center justify-center text-center",
                    EMPTY_CARD_STYLES,
                  )}
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/60">
                    <Icon name="search" size="m" aria-hidden />
                  </span>
                  <Column gap="8" className="max-w-xs">
                    <Heading variant="heading-strong-xs">
                      No experiences found
                    </Heading>
                    <Text variant="body-default-xs" onBackground="neutral-weak">
                      Try a different keyword or switch categories to discover
                      more of the Dynamic Capital platform.
                    </Text>
                  </Column>
                </Card>
              </motion.div>
            )}
          </Scroller>
        </div>

        <Row className="items-center justify-between border-t border-border/40 pt-4 text-xs text-muted-foreground">
          <Text as="span" variant="label-default-xs">
            {filteredItems.length} {resultLabel}
          </Text>
          <Text
            as="span"
            variant="label-default-xs"
            onBackground="neutral-weak"
          >
            {hasActiveFilters ? "Filters active" : "Showing all destinations"}
          </Text>
        </Row>
      </Column>
    </motion.section>
  );
};

export default FilterComponent;
