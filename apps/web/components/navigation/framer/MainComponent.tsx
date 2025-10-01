"use client";

import { motion } from "framer-motion";
import React, { useState } from "react";
import { cn } from "@/utils";
import Circle from "./Circle";

const TOGGLE_ICON =
  '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"> <path fill-rule="evenodd" clip-rule="evenodd" d="M4.18934 4.18934C4.77513 3.60355 5.72487 3.60355 6.31066 4.18934L12 9.87868L17.6893 4.18934C18.2751 3.60355 19.2249 3.60355 19.8107 4.18934C20.3964 4.77513 20.3964 5.72487 19.8107 6.31066L14.1213 12L19.8107 17.6893C20.3964 18.2751 20.3964 19.2249 19.8107 19.8107C19.2249 20.3964 18.2751 20.3964 17.6893 19.8107L12 14.1213L6.31066 19.8107C5.72487 20.3964 4.77513 20.3964 4.18934 19.8107C3.60355 19.2249 3.60355 18.2751 4.18934 17.6893L9.87868 12L4.18934 6.31066C3.60355 5.72487 3.60355 4.77513 4.18934 4.18934Z" fill="black"/> </svg>';

export interface MainNavItem {
  id: string;
  icon: string;
  ariaLabel: string;
  color?: string;
  isActive?: boolean;
  onClick?: () => void | Promise<void>;
}

export interface MainComponentProps {
  items?: MainNavItem[];
  className?: string;
}

const containerTransition = {
  type: "spring",
  duration: 0.6,
  bounce: 0,
} as const;
const optionsTransition = {
  type: "spring",
  duration: 0.45,
  bounce: 0.15,
} as const;

const MainComponent: React.FC<MainComponentProps> = (
  { items = [], className },
) => {
  const [expanded, setExpanded] = useState(false);

  const handleToggle = () => setExpanded((prev) => !prev);

  const handleItemClick = async (item: MainNavItem) => {
    if (item.onClick) {
      await item.onClick();
    }
    setExpanded(false);
  };

  return (
    <motion.nav
      className={cn(
        "relative flex h-10 items-center rounded-full border border-white/10 bg-background/80 px-2 shadow-lg shadow-black/10 backdrop-blur",
        className,
      )}
      initial={false}
      animate={{ width: expanded ? 232 : 56 }}
      transition={containerTransition}
    >
      <motion.div
        animate={{ rotate: expanded ? 135 : 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
      >
        <Circle
          icon={TOGGLE_ICON}
          color="rgba(40,40,41,0.95)"
          ariaLabel={expanded ? "Collapse navigation" : "Expand navigation"}
          onClick={handleToggle}
        />
      </motion.div>
      <motion.div
        className="ml-2 flex items-center gap-2 overflow-hidden"
        animate={{
          opacity: expanded ? 1 : 0,
          x: expanded ? 0 : -24,
          pointerEvents: expanded ? "auto" : "none",
        }}
        transition={optionsTransition}
      >
        {items.map((item) => (
          <Circle
            key={item.id}
            icon={item.icon}
            color={item.color ?? "rgba(255,255,255,0.12)"}
            ariaLabel={item.ariaLabel}
            onClick={() => handleItemClick(item)}
            role="link"
            tabIndex={expanded ? 0 : -1}
            isActive={item.isActive}
          />
        ))}
      </motion.div>
    </motion.nav>
  );
};

export default MainComponent;
