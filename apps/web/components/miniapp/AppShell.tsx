"use client";

import {
  type CSSProperties,
  type ReactNode,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AnimatePresence, motion, type Transition } from "framer-motion";
import { usePathname } from "next/navigation";

const transition: Transition = {
  type: "spring",
  stiffness: 200,
  damping: 30,
  mass: 0.8,
};

const useIsomorphicLayoutEffect = typeof window !== "undefined"
  ? useLayoutEffect
  : useEffect;

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
  const footerRef = useRef<HTMLDivElement | null>(null);
  const [footerHeight, setFooterHeight] = useState<number | null>(null);

  useIsomorphicLayoutEffect(() => {
    const element = footerRef.current;
    if (!element) {
      return;
    }

    const updateHeight = () => {
      const next = element.getBoundingClientRect().height;
      setFooterHeight((previous) => {
        if (previous === null) {
          return next;
        }

        return Math.abs(previous - next) > 0.5 ? next : previous;
      });
    };

    updateHeight();

    const observer = new ResizeObserver(() => {
      updateHeight();
    });

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [footer]);

  const shellStyle = useMemo<CSSProperties | undefined>(() => {
    if (footerHeight == null) {
      return undefined;
    }

    return {
      "--miniapp-footer-height": `${Math.round(footerHeight)}px`,
    } as CSSProperties;
  }, [footerHeight]);

  return (
    <div
      className="system-shell app-shell"
      data-variant="miniapp"
      style={shellStyle}
    >
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
        ? (
          <div
            ref={footerRef}
            className="system-shell__footer app-shell-footer"
          >
            {footer}
          </div>
        )
        : null}
    </div>
  );
}
