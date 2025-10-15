"use client";

import { AnimatePresence, motion, type Transition } from "framer-motion";
import { usePathname } from "next/navigation";
import { type ReactNode } from "react";

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
  footer?: ReactNode;
  header?: ReactNode;
}) {
  const pathname = usePathname();
  const hasHeader = Boolean(header);

  return (
    <div className="system-shell app-shell" data-variant="miniapp">
      <div className="system-shell__body app-shell-body">
        {header ? <div className="app-shell-header">{header}</div> : null}
        <AnimatePresence initial={false} mode="wait">
          <motion.main
            key={pathname}
            className="app-shell-main"
            data-has-header={hasHeader ? "true" : "false"}
            initial={{ y: 24, opacity: 0.4 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -12, opacity: 0 }}
            transition={transition}
          >
            {children}
          </motion.main>
        </AnimatePresence>
      </div>
      {footer
        ? <div className="system-shell__footer app-shell-footer">{footer}</div>
        : null}
    </div>
  );
}
