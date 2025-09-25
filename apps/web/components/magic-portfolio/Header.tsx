"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import classNames from "classnames";
import { usePathname } from "next/navigation";

import { Button, Fade, Flex, Row, Text } from "@/components/dynamic-ui-system";

import { display, isRouteEnabled, person } from "@/resources";
import { useAuth } from "@/hooks/useAuth";
import { ThemeToggle } from "./ThemeToggle";
import styles from "./Header.module.scss";
import { resolvePrimaryNavItems } from "./navigation";

type TimeDisplayProps = {
  timeZone: string;
  locale?: string; // Optionally allow locale, defaulting to 'en-GB'
};

const TimeDisplay: React.FC<TimeDisplayProps> = (
  { timeZone, locale = "en-GB" },
) => {
  const [currentTime, setCurrentTime] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const options: Intl.DateTimeFormatOptions = {
        timeZone,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      };
      const timeString = new Intl.DateTimeFormat(locale, options).format(now);
      setCurrentTime(timeString);
    };

    updateTime();
    const intervalId = setInterval(updateTime, 1000);

    return () => clearInterval(intervalId);
  }, [timeZone, locale]);

  return <>{currentTime}</>;
};

export default TimeDisplay;

export const Header = () => {
  const pathname = usePathname() ?? "";
  const { user, signOut } = useAuth();
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
    (item) => isRouteEnabled(item.route) || item.route === "/",
  );

  return (
    <>
      <Fade
        s={{ hide: true }}
        fillWidth
        position="fixed"
        height="80"
        zIndex={9}
      />
      <Fade
        hide
        s={{ hide: false }}
        fillWidth
        position="fixed"
        bottom="0"
        to="top"
        height="80"
        zIndex={9}
      />
      <Row
        fitHeight
        className={styles.position}
        position="sticky"
        as="header"
        zIndex={9}
        fillWidth
        padding="8"
        horizontal="center"
        data-border="rounded"
        s={{
          position: "fixed",
        }}
      >
        <Row
          paddingLeft="12"
          fillWidth
          vertical="center"
          textVariant="body-default-s"
        >
          {display.location && <Row s={{ hide: true }}>{person.location}</Row>}
        </Row>
        <Row fillWidth horizontal="center">
          <Row
            as="nav"
            aria-label="Primary navigation"
            className={styles.navLinks}
            suppressHydrationWarning
          >
            {navItems.map((item, index) => (
              <React.Fragment key={item.key}>
                {index > 0 && (
                  <span aria-hidden className={styles.divider}>
                    |
                  </span>
                )}
                <Link
                  href={item.href}
                  className={classNames(styles.navLink, {
                    [styles.navLinkActive]: item.selected,
                  })}
                >
                  {item.label}
                </Link>
              </React.Fragment>
            ))}
          </Row>
          {display.themeSwitcher && (
            <Row className={styles.themeToggle}>
              <ThemeToggle />
            </Row>
          )}
        </Row>
        <Flex fillWidth horizontal="end" vertical="center">
          <Flex
            paddingRight="12"
            horizontal="end"
            vertical="center"
            textVariant="body-default-s"
            gap="20"
          >
            <Flex s={{ hide: true }}>
              {display.time && <TimeDisplay timeZone={person.location} />}
            </Flex>
            {user
              ? (
                <Button size="s" variant="secondary" onClick={() => signOut()}>
                  Logout
                </Button>
              )
              : (
                <Button size="s" variant="secondary" href="/login">
                  Login
                </Button>
              )}
          </Flex>
        </Flex>
      </Row>
    </>
  );
};
