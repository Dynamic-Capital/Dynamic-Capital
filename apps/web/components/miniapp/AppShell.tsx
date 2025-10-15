"use client";

import { AnimatePresence, motion, type Transition } from "framer-motion";
import { usePathname } from "next/navigation";
import { type ReactNode, useMemo } from "react";

const transition: Transition = {
  type: "spring",
  stiffness: 200,
  damping: 30,
  mass: 0.8,
};

export function AppShell({
  children,
  footer,
  header,
}: {
  children: ReactNode;
  footer: ReactNode;
  header?: ReactNode;
}) {
  const pathname = usePathname();
  const hasHeader = Boolean(header);

  const mainStyle = useMemo(
    () => ({
      paddingInline: "clamp(16px, 4vw, 28px)",
      paddingTop: hasHeader
        ? "max(16px, var(--safe-top))"
        : "calc(var(--safe-top) + 16px)",
      paddingBottom: "clamp(96px, 12vh, 144px)",
      display: "grid",
      alignContent: "start" as const,
      gap: "clamp(20px, 5vw, 36px)",
      width: "min(100%, 720px)",
      marginInline: "auto",
    }),
    [hasHeader],
  );

  return (
    <div className="app-shell">
      <div className="app-shell-body">
        {header ?? null}
        <AnimatePresence initial={false} mode="wait">
          <motion.main
            key={pathname}
            className="app-shell-main"
            initial={{ y: 24, opacity: 0.4 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -12, opacity: 0 }}
            transition={transition}
            style={mainStyle}
          >
            {children}
          </motion.main>
        </AnimatePresence>
      </div>
      {footer}
    </div>
  );
}
