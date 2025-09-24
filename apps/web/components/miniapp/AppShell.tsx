"use client";

import { AnimatePresence, motion, type Transition } from "framer-motion";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const transition: Transition = {
  type: "spring",
  stiffness: 200,
  damping: 30,
  mass: 0.8,
};

export function AppShell({
  children,
  footer,
}: {
  children: ReactNode;
  footer: ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="app-shell">
      <AnimatePresence initial={false} mode="wait">
        <motion.main
          key={pathname}
          initial={{ y: 24, opacity: 0.4 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -12, opacity: 0 }}
          transition={transition}
          style={{
            padding: "16px",
            paddingTop: "calc(var(--safe-top) + 8px)",
            display: "grid",
            alignContent: "start",
            gap: "16px",
          }}
        >
          {children}
        </motion.main>
      </AnimatePresence>
      {footer}
    </div>
  );
}
