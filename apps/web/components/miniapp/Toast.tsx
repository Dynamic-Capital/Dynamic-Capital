"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

interface ToastProps {
  text: string;
  show: boolean;
  duration?: number;
  onDismiss?: () => void;
}

export function Toast({ text, show, duration = 2400, onDismiss }: ToastProps) {
  const [visible, setVisible] = useState(show);

  useEffect(() => {
    setVisible(show);
  }, [show]);

  useEffect(() => {
    if (!visible) return;
    const timeout = window.setTimeout(() => {
      setVisible(false);
      onDismiss?.();
    }, duration);
    return () => window.clearTimeout(timeout);
  }, [duration, onDismiss, visible]);

  return (
    <AnimatePresence>
      {visible
        ? (
          <motion.div
            initial={{ y: 32, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 32, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 32 }}
            style={{
              position: "fixed",
              left: 12,
              right: 12,
              bottom: `calc(72px + var(--safe-bottom))`,
              background: "var(--brand-surface)",
              color: "var(--brand-text)",
              padding: "12px 16px",
              borderRadius: 12,
              boxShadow: "var(--shadow)",
              textAlign: "center",
              pointerEvents: "auto",
              zIndex: 50,
            }}
          >
            {text}
          </motion.div>
        )
        : null}
    </AnimatePresence>
  );
}
