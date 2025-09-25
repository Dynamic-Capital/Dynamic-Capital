"use client";

import { useEffect, useMemo, useState } from "react";

import { motion, useReducedMotion } from "framer-motion";

import { Button, Icon, Text } from "@/components/dynamic-ui-system";

import styles from "./StickyWalletCTA.module.scss";

const STICKY_THRESHOLD = 320;

export function StickyWalletCTA() {
  const [hasScrolled, setHasScrolled] = useState(false);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const handleScroll = () => {
      setHasScrolled(window.scrollY > STICKY_THRESHOLD);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const animation = useMemo(
    () => ({
      initial: { opacity: 0, y: 24, scale: 0.95 },
      animate: hasScrolled
        ? { opacity: 1, y: 0, scale: 1 }
        : { opacity: 0, y: 24, scale: reduceMotion ? 1 : 0.95 },
      transition: reduceMotion
        ? undefined
        : ({ type: "spring", stiffness: 200, damping: 30 } as const),
    }),
    [hasScrolled, reduceMotion],
  );

  return (
    <motion.div className={styles.container} {...animation}>
      <div className={styles.inner}>
        <span className={styles.statusText}>
          <Icon name="sparkles" onBackground="brand-medium" />
          <Text variant="label-default-s" onBackground="brand-weak">
            Wallets secured with institutional-grade custody
          </Text>
        </span>
        <Button
          href="/login?connect-wallet=true"
          variant="primary"
          size="m"
          weight="strong"
          prefixIcon="rocket"
        >
          Connect Wallet
        </Button>
      </div>
    </motion.div>
  );
}
