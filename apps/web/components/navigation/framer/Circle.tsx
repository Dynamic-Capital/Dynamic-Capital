"use client";

import { motion } from "framer-motion";
import React from "react";

export interface CircleProps {
  icon: string;
  color: string;
  ariaLabel: string;
  onClick?: () => void | Promise<void>;
  role?: string;
  tabIndex?: number;
  isActive?: boolean;
}

const Circle = React.forwardRef<HTMLButtonElement, CircleProps>(function Circle(
  { icon, color, ariaLabel, onClick, role = "button", tabIndex, isActive },
  ref,
) {
  return (
    <motion.button
      ref={ref}
      type="button"
      className="grid h-10 w-10 place-items-center rounded-full text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/80"
      style={{
        backgroundColor: color,
        boxShadow: isActive
          ? "0 0 0 2px rgba(255,255,255,0.6)"
          : "0 0 0 1px rgba(255,255,255,0.25)",
      }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      aria-label={ariaLabel}
      onClick={onClick}
      role={role}
      tabIndex={tabIndex}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none h-5 w-5"
        dangerouslySetInnerHTML={{ __html: icon }}
      />
    </motion.button>
  );
});

export default Circle;
