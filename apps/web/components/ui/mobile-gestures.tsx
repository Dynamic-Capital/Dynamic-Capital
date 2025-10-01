"use client";

import React, { useEffect, useState } from "react";
import { AnimatePresence, motion, PanInfo } from "framer-motion";
import { cn } from "@/utils";

interface MobileSwipeContainerProps {
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  className?: string;
  threshold?: number;
}

export const MobileSwipeContainer: React.FC<MobileSwipeContainerProps> = ({
  children,
  onSwipeLeft,
  onSwipeRight,
  className = "",
  threshold = 100,
}) => {
  const handleDragEnd = (event: any, info: PanInfo) => {
    if (Math.abs(info.offset.x) > threshold) {
      if (info.offset.x > 0 && onSwipeRight) {
        onSwipeRight();
      } else if (info.offset.x < 0 && onSwipeLeft) {
        onSwipeLeft();
      }
    }
  };

  return (
    <motion.div
      className={cn("w-full", className)}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.2}
      onDragEnd={handleDragEnd}
      whileDrag={{ scale: 0.98 }}
    >
      {children}
    </motion.div>
  );
};

interface MobilePullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  threshold?: number;
}

export const MobilePullToRefresh: React.FC<MobilePullToRefreshProps> = ({
  onRefresh,
  children,
  threshold = 60,
}) => {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleDrag = (event: any, info: PanInfo) => {
    if (info.offset.y > 0) {
      setPullDistance(Math.min(info.offset.y, threshold * 1.5));
    }
  };

  const handleDragEnd = async (event: any, info: PanInfo) => {
    if (info.offset.y > threshold && !isRefreshing) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    }
    setPullDistance(0);
  };

  return (
    <motion.div
      className="relative overflow-hidden"
      drag="y"
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={0.3}
      onDrag={handleDrag}
      onDragEnd={handleDragEnd}
    >
      {/* Pull to refresh indicator */}
      <AnimatePresence>
        {(pullDistance > 0 || isRefreshing) && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="absolute top-0 left-0 right-0 z-50 flex items-center justify-center py-4 bg-background/80 backdrop-blur-sm"
          >
            <motion.div
              animate={isRefreshing ? { rotate: 360 } : {}}
              transition={isRefreshing
                ? { duration: 1, repeat: Infinity, ease: "linear" }
                : {}}
              className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full"
            />
            <span className="ml-2 text-sm text-muted-foreground">
              {isRefreshing ? "Refreshing..." : "Pull to refresh"}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        animate={{ y: pullDistance * 0.5 }}
        transition={{ type: "spring", damping: 20, stiffness: 300 }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
};

interface MobileBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  height?: string;
}

export const MobileBottomSheet: React.FC<MobileBottomSheetProps> = ({
  isOpen,
  onClose,
  children,
  height = "50vh",
}) => {
  const [dragY, setDragY] = useState(0);

  const handleDragEnd = (event: any, info: PanInfo) => {
    if (info.offset.y > 100) {
      onClose();
    }
    setDragY(0);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40"
            onClick={onClose}
          />

          {/* Bottom Sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.1}
            onDrag={(event, info) => setDragY(info.offset.y)}
            onDragEnd={handleDragEnd}
            className="fixed bottom-0 left-0 right-0 z-50 bg-background rounded-t-xl shadow-2xl"
            style={{ height }}
          >
            {/* Drag Handle */}
            <div className="flex justify-center pt-2 pb-4">
              <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
            </div>

            <div className="h-full overflow-y-auto px-4 pb-4">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

interface TouchFeedbackProps {
  children: React.ReactNode;
  haptic?: boolean;
  className?: string;
  onClick?: () => void;
}

export const TouchFeedback: React.FC<TouchFeedbackProps> = ({
  children,
  haptic = true,
  className = "",
  onClick,
}) => {
  const handleTap = () => {
    if (haptic && "vibrate" in navigator) {
      navigator.vibrate(10);
    }
    onClick?.();
  };

  return (
    <motion.div
      className={cn("cursor-pointer select-none", className)}
      whileTap={{ scale: 0.95 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
      onTap={handleTap}
    >
      {children}
    </motion.div>
  );
};

interface MobileScrollIndicatorProps {
  scrollableRef: React.RefObject<HTMLElement>;
  className?: string;
}

export const MobileScrollIndicator: React.FC<MobileScrollIndicatorProps> = ({
  scrollableRef,
  className = "",
}) => {
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const element = scrollableRef.current;
    if (!element) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = element;
      const totalScrollable = scrollHeight - clientHeight;
      const progress = totalScrollable > 0 ? scrollTop / totalScrollable : 0;
      setScrollProgress(progress);
    };

    element.addEventListener("scroll", handleScroll);
    return () => element.removeEventListener("scroll", handleScroll);
  }, [scrollableRef]);

  return (
    <div
      className={cn(
        "fixed top-0 left-0 right-0 h-1 bg-muted/30 z-50",
        className,
      )}
    >
      <motion.div
        className="h-full bg-primary"
        style={{ scaleX: scrollProgress }}
        initial={{ scaleX: 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 40 }}
      />
    </div>
  );
};

export default {
  MobileSwipeContainer,
  MobilePullToRefresh,
  MobileBottomSheet,
  TouchFeedback,
  MobileScrollIndicator,
};
