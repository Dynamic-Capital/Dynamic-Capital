"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import classNames from "classnames";
import { usePathname } from "next/navigation";

import styles from "./MobileFooterNav.module.scss";
import { resolvePrimaryNavItems } from "./navigation";

export function MobileFooterNav() {
  const pathname = usePathname() ?? "";
  const [hash, setHash] = useState<string>("");

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleHashChange = () => {
      setHash(window.location.hash);
    };

    handleHashChange();
    window.addEventListener("hashchange", handleHashChange);

    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setHash(window.location.hash);
    }
  }, [pathname]);

  const navItems = resolvePrimaryNavItems(
    pathname,
    hash,
    (item) => item.includeInFooter,
  );

  if (!navItems.length) {
    return null;
  }

  return (
    <nav className={styles.container} aria-label="Mobile primary navigation">
      <div className={styles.navList}>
        {navItems.map((item) => (
          <Link
            key={item.key}
            href={item.href}
            className={classNames(styles.navItem, {
              [styles.navItemActive]: item.selected,
            })}
          >
            <span className={styles.emoji} aria-hidden>
              {item.emoji}
            </span>
            <span className={styles.label}>{item.mobileLabel}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}

export default MobileFooterNav;
