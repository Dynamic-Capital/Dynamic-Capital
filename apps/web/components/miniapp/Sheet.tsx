"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { ReactNode } from "react";
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { haptic } from "@/lib/telegram";

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

export function Sheet({ open, onClose, title, children }: SheetProps) {
  useEffect(() => {
    if (open) {
      haptic("light");
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open
        ? (
          <>
            <motion.div
              key="sheet-backdrop"
              className="fixed inset-0 z-40"
              style={{ background: "rgba(3, 5, 7, 0.65)" }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={onClose}
            />
            <motion.div
              key="sheet-content"
              className="fixed left-0 right-0 bottom-0 z-50"
              style={{
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                background: "var(--brand-surface)",
                padding: "24px 20px",
                boxShadow: "0 -12px 40px rgba(0,0,0,0.45)",
              }}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 240, damping: 28 }}
            >
              {title
                ? (
                  <div style={{ marginBottom: 16, fontWeight: 600 }}>
                    {title}
                  </div>
                )
                : null}
              <div
                style={{ color: "var(--brand-text)", display: "grid", gap: 12 }}
              >
                {children}
              </div>
              <button
                className="btn"
                style={{ marginTop: 24 }}
                onClick={onClose}
              >
                Close
              </button>
            </motion.div>
          </>
        )
        : null}
    </AnimatePresence>,
    document.body,
  );
}
