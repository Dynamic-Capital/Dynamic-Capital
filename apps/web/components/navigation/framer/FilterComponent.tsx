"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronRight, Search, SlidersHorizontal } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/utils";

import type { NavItem } from "../nav-items";

const NAV_ITEM_CATEGORY_LOOKUP: Record<string, CoreCategoryId> = {
  overview: "foundations",
  token: "foundations",
  wallet: "foundations",
  markets: "insights",
  community: "community",
  miniApp: "products",
  api: "operations",
  admin: "operations",
  studio: "products",
  "dynamic-portfolio": "products",
  "dynamic-visual": "insights",
  "ui-optimizer": "operations",
  "dynamic-cli": "operations",
  "market-review": "insights",
  advantages: "community",
};

type CoreCategoryId =
  | "foundations"
  | "products"
  | "insights"
  | "operations"
  | "community";
type FilterCategoryId = "all" | CoreCategoryId;

interface FilterCategoryOption {
  id: FilterCategoryId;
  label: string;
  count: number;
}

interface EnhancedNavItem extends NavItem {
  href: string;
  categoryId: CoreCategoryId;
  categoryLabel: string;
  isActive: boolean;
}

const CATEGORY_CONFIG: Record<CoreCategoryId, {
  label: string;
  badgeClass: string;
  indicatorClass: string;
}> = {
  foundations: {
    label: "Foundations",
    badgeClass: "border-transparent bg-emerald-500/15 text-emerald-200",
    indicatorClass: "bg-emerald-400/80",
  },
  products: {
    label: "Products",
    badgeClass: "border-transparent bg-sky-500/15 text-sky-200",
    indicatorClass: "bg-sky-400/80",
  },
  insights: {
    label: "Insights",
    badgeClass: "border-transparent bg-amber-500/15 text-amber-200",
    indicatorClass: "bg-amber-400/80",
  },
  operations: {
    label: "Operations",
    badgeClass: "border-transparent bg-violet-500/15 text-violet-200",
    indicatorClass: "bg-violet-400/80",
  },
  community: {
    label: "Community",
    badgeClass: "border-transparent bg-rose-500/15 text-rose-200",
    indicatorClass: "bg-rose-400/80",
  },
};

const CATEGORY_ORDER: FilterCategoryId[] = [
  "all",
  "foundations",
  "products",
  "insights",
  "operations",
  "community",
];

const getCategoryIdForItem = (itemId: string): CoreCategoryId => {
  return NAV_ITEM_CATEGORY_LOOKUP[itemId] ?? "products";
};

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

const FilterComponent: React.FC<FilterComponentProps> = ({
  items,
  className,
  title = "Navigate anywhere faster",
  description =
    "Search every Dynamic Capital surface and jump to the experience you need.",
  onItemSelect,
}) => {
  const pathname = usePathname() ?? "/";
  const shouldReduceMotion = useReducedMotion();
  const [hash, setHash] = useState<string>("");
  const [query, setQuery] = useState<string>("");
  const [activeCategory, setActiveCategory] = useState<FilterCategoryId>("all");

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
      const categoryId = getCategoryIdForItem(item.id);
      const categoryLabel = CATEGORY_CONFIG[categoryId].label;

      return {
        ...item,
        href,
        categoryId,
        categoryLabel,
        isActive: isNavItemActive(item, pathname, hash),
      } satisfies EnhancedNavItem;
    });
  }, [hash, items, pathname]);

  const categories = useMemo<FilterCategoryOption[]>(() => {
    const counts = enhancedItems.reduce<Record<CoreCategoryId, number>>(
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

      const config = CATEGORY_CONFIG[categoryId];
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
        "flex h-full flex-col gap-4 rounded-3xl border border-white/10 bg-background/95 p-6 shadow-[0_24px_60px_-30px_rgba(15,23,42,0.75)] backdrop-blur-xl",
        className,
      )}
    >
      <header className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
            <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-primary/80">
              <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden />
              Filter navigation
            </span>
            <div>
              <h2 className="text-xl font-semibold leading-tight text-foreground">
                {title}
              </h2>
              {description && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {description}
                </p>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            disabled={!hasActiveFilters}
            className="self-start"
          >
            Reset
          </Button>
        </div>
        <div className="flex flex-col gap-3">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search desks, products, or workflows"
              aria-label="Search navigation entries"
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => setActiveCategory(category.id)}
                className={cn(
                  "flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  activeCategory === category.id
                    ? "border-primary/70 bg-primary/10 text-primary"
                    : "border-border/60 text-muted-foreground hover:border-primary/40 hover:text-foreground",
                )}
                aria-pressed={activeCategory === category.id}
              >
                <span>{category.label}</span>
                <span className="text-[10px] font-medium text-muted-foreground">
                  {category.count}
                </span>
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="flex-1">
        <ScrollArea className="h-full pr-2">
          <AnimatePresence initial={false}>
            {filteredItems.map((item) => {
              const Icon = item.icon;
              const categoryStyles = CATEGORY_CONFIG[item.categoryId];
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
                  className="mb-3 last:mb-0"
                >
                  <Link
                    href={item.href}
                    onClick={() => onItemSelect?.(item)}
                    className={cn(
                      "group relative flex items-start gap-4 rounded-2xl border px-4 py-4 transition",
                      item.isActive
                        ? "border-primary/60 bg-primary/10"
                        : "border-border/40 bg-card/40 hover:border-primary/40 hover:bg-card/60",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-full text-foreground/90 transition group-hover:scale-105",
                        item.isActive
                          ? "bg-primary/20 text-primary"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {Icon ? <Icon className="h-5 w-5" aria-hidden /> : null}
                    </span>
                    <div className="flex flex-1 flex-col gap-1 text-left">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-foreground">
                          {item.label}
                        </span>
                        <Badge
                          variant="outline"
                          className={cn(
                            "flex items-center gap-1 border-transparent px-2 py-0",
                            categoryStyles.badgeClass,
                          )}
                        >
                          <span
                            className={cn(
                              "h-1.5 w-1.5 rounded-full",
                              categoryStyles.indicatorClass,
                            )}
                            aria-hidden
                          />
                          {categoryStyles.label}
                        </Badge>
                        {item.isActive && (
                          <span className="text-[11px] font-medium uppercase tracking-wide text-primary">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {item.description}
                      </p>
                      {item.step && (
                        <span className="text-xs uppercase tracking-wide text-muted-foreground/80">
                          {item.step}
                        </span>
                      )}
                    </div>
                    <ChevronRight
                      className="mt-1 h-4 w-4 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-foreground"
                      aria-hidden
                    />
                  </Link>
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
              className="mt-6 flex h-40 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border/70 text-center"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-muted/60">
                <Search className="h-5 w-5 text-muted-foreground" aria-hidden />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">
                  No experiences found
                </p>
                <p className="mx-auto max-w-xs text-xs text-muted-foreground">
                  Try a different keyword or switch categories to discover more
                  of the Dynamic Capital platform.
                </p>
              </div>
            </motion.div>
          )}
        </ScrollArea>
      </div>

      <footer className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {filteredItems.length} {resultLabel}
        </span>
        {hasActiveFilters
          ? (
            <span className="text-muted-foreground/80">
              Filters active
            </span>
          )
          : (
            <span className="text-muted-foreground/60">
              Showing all destinations
            </span>
          )}
      </footer>
    </motion.section>
  );
};

FilterComponent.displayName = "NavigationFilter";

export default FilterComponent;
