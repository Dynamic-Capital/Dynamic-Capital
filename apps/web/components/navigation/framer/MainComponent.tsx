"use client";

import { AnimatePresence, motion } from "framer-motion";
import { MessageCircle, X } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";

import { cn } from "@/utils";

import Circle from "./Circle";

const TOGGLE_OPEN_ICON =
  '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M21 11.5C21 16.1944 16.9706 20 12 20C10.3771 20 8.84062 19.6012 7.5 18.9003L3 20L4.19974 15.1997C3.43371 13.878 3 12.3514 3 10.75C3 6.05559 7.02944 2.25 12 2.25C16.9706 2.25 21 6.05559 21 10.75Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M7.5 11H7.51" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 11H12.01" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M16.5 11H16.51" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const TOGGLE_CLOSE_ICON =
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
  senderName?: string;
  message?: string;
  avatarUrl?: string;
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

const EXPANDED_WIDTH = 280;
const COLLAPSED_WIDTH = 56;

const DEFAULT_SENDER = "Jorn";
const DEFAULT_MESSAGE =
  "How the hell is this gooey effect possible in Framer? It looks so good!";
const DEFAULT_AVATAR_URL =
  "https://framerusercontent.com/images/Vt2XEybYF81TCP3Dwr13rr2bzuQ.png";

const MainComponent: React.FC<MainComponentProps> = ({
  items = [],
  className,
  senderName = DEFAULT_SENDER,
  message = DEFAULT_MESSAGE,
  avatarUrl = DEFAULT_AVATAR_URL,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const hidePreviewTimeout = useRef<number | null>(null);
  const introAnimationTimeouts = useRef<number[]>([]);
  const hasRunIntroAnimation = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    if (expanded || showPreview || hasRunIntroAnimation.current) {
      return undefined;
    }

    hasRunIntroAnimation.current = true;
    const showId = window.setTimeout(() => setShowPreview(true), 1000);
    const hideId = window.setTimeout(() => setShowPreview(false), 2500);
    introAnimationTimeouts.current = [showId, hideId];

    return () => {
      window.clearTimeout(showId);
      window.clearTimeout(hideId);
    };
  }, [expanded, showPreview]);

  useEffect(() => {
    return () => {
      introAnimationTimeouts.current.forEach((timeoutId) => {
        clearTimeout(timeoutId);
      });
      introAnimationTimeouts.current = [];

      if (hidePreviewTimeout.current) {
        clearTimeout(hidePreviewTimeout.current);
      }
    };
  }, []);

  const cancelIntroAnimation = () => {
    introAnimationTimeouts.current.forEach((timeoutId) => {
      clearTimeout(timeoutId);
    });
    introAnimationTimeouts.current = [];
  };

  const scheduleHidePreview = () => {
    if (hidePreviewTimeout.current) {
      clearTimeout(hidePreviewTimeout.current);
    }

    if (typeof window === "undefined") {
      setShowPreview(false);
      return;
    }

    hidePreviewTimeout.current = window.setTimeout(() => {
      setShowPreview(false);
      hidePreviewTimeout.current = null;
    }, 220);
  };

  const handleToggle = () => {
    cancelIntroAnimation();

    setExpanded((previous) => {
      const next = !previous;

      if (next) {
        if (hidePreviewTimeout.current) {
          clearTimeout(hidePreviewTimeout.current);
          hidePreviewTimeout.current = null;
        }
        setShowPreview(true);
      } else {
        scheduleHidePreview();
      }

      return next;
    });
  };

  const handleItemClick = async (item: MainNavItem) => {
    if (item.onClick) {
      await item.onClick();
    }

    setExpanded(false);
    scheduleHidePreview();
  };

  const showNotification = showPreview || expanded;
  const containerWidth = showNotification || expanded
    ? EXPANDED_WIDTH
    : COLLAPSED_WIDTH;
  const toggleIcon = expanded ? TOGGLE_CLOSE_ICON : TOGGLE_OPEN_ICON;

  return (
    <motion.div
      layout
      className="relative flex flex-col items-center gap-3"
      initial={false}
      animate={{ width: containerWidth }}
      transition={containerTransition}
    >
      <AnimatePresence initial={false}>
        {showNotification
          ? (
            <motion.div
              key="notification"
              layout
              initial={{ opacity: 0, y: 16, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, y: 16, height: 0 }}
              transition={{ type: "spring", bounce: 0, duration: 0.6 }}
              className="w-full"
            >
              <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/80 px-5 py-4 text-white shadow-[0_24px_60px_-30px_rgba(15,23,42,0.75)] backdrop-blur-xl">
                <div className="flex items-center gap-3">
                  <span className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-white/10 ring-1 ring-white/15">
                    <img
                      alt={`${senderName} avatar`}
                      src={avatarUrl}
                      width={40}
                      height={40}
                      className="h-10 w-10 object-cover"
                    />
                  </span>
                  <p className="flex-1 text-sm font-medium leading-tight">
                    {senderName} messaged you
                  </p>
                  <button
                    type="button"
                    onClick={handleToggle}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition hover:border-white/40 hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-primary/70"
                    aria-expanded={expanded}
                    aria-label={expanded
                      ? "Collapse message"
                      : "Expand message"}
                  >
                    {expanded
                      ? <X className="h-4 w-4" aria-hidden="true" />
                      : (
                        <MessageCircle
                          className="h-4 w-4"
                          aria-hidden="true"
                        />
                      )}
                  </button>
                </div>
                <AnimatePresence initial={false}>
                  {expanded
                    ? (
                      <motion.p
                        key="message"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        transition={{
                          type: "spring",
                          bounce: 0,
                          duration: 0.4,
                          delay: 0.05,
                        }}
                        className="mt-3 text-sm leading-relaxed text-zinc-300"
                      >
                        {message}
                      </motion.p>
                    )
                    : null}
                </AnimatePresence>
                <motion.div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 -z-10 rounded-[32px]"
                  initial={false}
                  animate={{
                    opacity: expanded ? 0.55 : 0.4,
                  }}
                  transition={{ type: "spring", duration: 0.6, bounce: 0 }}
                  style={{
                    background:
                      "radial-gradient(120% 120% at 0% 0%, rgba(59,130,246,0.35), transparent), radial-gradient(120% 120% at 100% 0%, rgba(236,72,153,0.35), transparent)",
                    filter: "blur(30px)",
                    mixBlendMode: "screen",
                  }}
                />
              </div>
            </motion.div>
          )
          : null}
      </AnimatePresence>

      <motion.nav
        className={cn(
          "relative flex h-12 items-center rounded-full border border-white/10 bg-background/80 px-2 shadow-lg shadow-black/20 backdrop-blur",
          className,
        )}
        initial={false}
        animate={{ width: expanded ? EXPANDED_WIDTH : COLLAPSED_WIDTH }}
        transition={containerTransition}
      >
        <motion.div
          animate={{ rotate: expanded ? 135 : 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
        >
          <Circle
            icon={toggleIcon}
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

      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-3 top-1/2 -z-10 h-[160px] -translate-y-1/2 rounded-full"
        initial={false}
        animate={{ opacity: expanded ? 0.55 : showPreview ? 0.4 : 0.25 }}
        transition={{ type: "spring", duration: 0.6, bounce: 0 }}
        style={{
          background:
            "radial-gradient(90% 120% at 10% 20%, rgba(59,130,246,0.25), transparent), radial-gradient(85% 120% at 90% 20%, rgba(236,72,153,0.25), transparent)",
          filter: "blur(60px)",
        }}
      />
    </motion.div>
  );
};

export default MainComponent;
