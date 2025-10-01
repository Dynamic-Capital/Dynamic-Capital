import React from "react";
import { LayoutGroup, motion } from "framer-motion";
import {
  AutoSizingContainer,
  AutoSizingText,
  ResponsiveSpacing,
} from "@/components/ui/auto-sizing";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils";

interface ResponsiveHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  variant?: "default" | "glass" | "brand";
}

export function ResponsiveHeader({
  title,
  subtitle,
  icon,
  actions,
  className,
  variant = "default",
}: ResponsiveHeaderProps) {
  const variantStyles = {
    default: "bg-background/80 backdrop-blur-md border-b border-border/50",
    glass: "glass-card backdrop-blur-xl border-b border-border/40",
    brand: "bg-gradient-brand text-white backdrop-blur-xl",
  };

  return (
    <motion.header
      className={cn(
        "sticky top-0 z-20 transition-all duration-300",
        variantStyles[variant],
        className,
      )}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <AutoSizingContainer
        responsive
        minHeight={60}
        maxHeight={120}
        className="flex items-center justify-between p-3 sm:p-4 lg:p-6"
      >
        <motion.div
          className="flex items-center gap-2 sm:gap-3 lg:gap-4 flex-1 min-w-0"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          {icon && (
            <div className="flex-shrink-0 h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 flex items-center justify-center">
              {icon}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <AutoSizingText
              minSize={14}
              maxSize={20}
              className="font-semibold leading-tight truncate"
            >
              {title}
            </AutoSizingText>
            {subtitle && (
              <AutoSizingText
                minSize={11}
                maxSize={14}
                className="text-muted-foreground leading-none mt-0.5 truncate"
              >
                {subtitle}
              </AutoSizingText>
            )}
          </div>
        </motion.div>

        {actions && (
          <motion.div
            className="flex-shrink-0 ml-2"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            {actions}
          </motion.div>
        )}
      </AutoSizingContainer>
    </motion.header>
  );
}

interface ResponsiveTabsProps {
  tabs: Array<{
    id: string;
    label: string;
    icon: React.ReactNode;
    count?: number;
  }>;
  activeTab: string;
  onTabChange: (tabId: string) => void;
  className?: string;
  ariaLabel?: string;
}

export function ResponsiveTabs(
  { tabs, activeTab, onTabChange, className, ariaLabel = "Tabs" }:
    ResponsiveTabsProps,
) {
  return (
    <motion.nav
      className={cn(
        "sticky top-16 sm:top-20 lg:top-24 z-10 glass-card backdrop-blur-md border-b",
        className,
      )}
      role="tablist"
      aria-label={ariaLabel}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
    >
      <AutoSizingContainer
        responsive
        minHeight={48}
        maxHeight={72}
        className="overflow-x-auto scrollbar-hide"
      >
        <LayoutGroup>
          <div
            className={`grid grid-cols-${tabs.length} gap-0.5 sm:gap-1 p-1 h-full`}
          >
            {tabs.map((tab, index) => (
              <motion.button
                key={tab.id}
                role="tab"
                id={`${tab.id}-tab`}
                aria-selected={activeTab === tab.id}
                aria-controls={`${tab.id}-panel`}
                onClick={() => onTabChange(tab.id)}
                className={cn(
                  "glass-tab relative flex flex-col items-center justify-center gap-0.5 sm:gap-1",
                  "text-xs sm:text-sm font-medium rounded-lg transition-all duration-200",
                  "hover:scale-105 px-1 sm:px-2 py-1 sm:py-2 min-w-0",
                  activeTab === tab.id ? "text-primary" : "hover:bg-accent/50",
                )}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="tab-indicator"
                    className="absolute inset-0 rounded-lg bg-primary/20 border border-primary/30"
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
                <div className="flex items-center justify-center h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 relative">
                  {tab.icon}
                  {tab.count && tab.count > 0 && (
                    <span className="absolute -top-1 -right-1 h-3 w-3 bg-primary text-white text-xs rounded-full flex items-center justify-center">
                      {tab.count > 9 ? "9+" : tab.count}
                    </span>
                  )}
                </div>
                <span className="text-xs lg:text-sm leading-none truncate max-w-full">
                  {tab.label}
                </span>
              </motion.button>
            ))}
          </div>
        </LayoutGroup>
      </AutoSizingContainer>
    </motion.nav>
  );
}

interface MobileOptimizedButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?:
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link"
    | "telegram"
    | "telegram-outline"
    | "glass"
    | "subtle"
    | "success"
    | "warning"
    | "info"
    | "premium"
    | "brand";
  size?: "sm" | "default" | "lg";
  fullWidth?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

export function MobileOptimizedButton({
  children,
  onClick,
  variant = "default",
  size = "default",
  fullWidth = false,
  loading = false,
  icon,
  className,
  disabled,
  ...props
}: MobileOptimizedButtonProps) {
  return (
    <Button
      responsive
      variant={variant}
      size={size}
      fullWidth={fullWidth}
      isLoading={loading}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "touch-target",
        "active:scale-95 transition-all duration-150",
        "hover:shadow-md hover:scale-[1.02]",
        "focus:ring-2 focus:ring-primary/50",
        className,
      )}
      {...props}
    >
      {icon && <span className="mr-2 flex-shrink-0">{icon}</span>}
      <span className="truncate">{children}</span>
    </Button>
  );
}
