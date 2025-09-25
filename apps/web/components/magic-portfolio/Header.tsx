"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import {
  Button,
  Fade,
  Flex,
  Line,
  Row,
  ToggleButton,
} from "@once-ui-system/core";

import {
  about,
  blog,
  display,
  gallery,
  isRouteEnabled,
  person,
  work,
} from "@/resources";
import type { IconName } from "@/resources/icons";
import { useAuth } from "@/hooks/useAuth";
import { ThemeToggle } from "./ThemeToggle";
import styles from "./Header.module.scss";

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

  const homeEnabled = isRouteEnabled("/");
  const plansEnabled = isRouteEnabled("/plans");
  const aboutEnabled = isRouteEnabled("/about");
  const workEnabled = isRouteEnabled("/work");
  const blogEnabled = isRouteEnabled("/blog");
  const galleryEnabled = isRouteEnabled("/gallery");

  const navItems = [
    homeEnabled
      ? {
        key: "home",
        label: "Home",
        icon: "home" as IconName,
        href: "/",
        selected: pathname === "/",
      }
      : null,
    plansEnabled
      ? {
        key: "plans",
        label: "VIP Plans",
        icon: "crown" as IconName,
        href: "/plans",
        selected: pathname.startsWith("/plans"),
      }
      : null,
    aboutEnabled
      ? {
        key: "about",
        label: about.label,
        icon: "person" as IconName,
        href: "/about",
        selected: pathname === "/about",
      }
      : null,
    workEnabled
      ? {
        key: "work",
        label: work.label,
        icon: "grid" as IconName,
        href: "/work",
        selected: pathname.startsWith("/work"),
      }
      : null,
    blogEnabled
      ? {
        key: "blog",
        label: blog.label,
        icon: "book" as IconName,
        href: "/blog",
        selected: pathname.startsWith("/blog"),
      }
      : null,
    galleryEnabled
      ? {
        key: "gallery",
        label: gallery.label,
        icon: "gallery" as IconName,
        href: "/gallery",
        selected: pathname.startsWith("/gallery"),
      }
      : null,
  ].filter((item): item is {
    key: string;
    label: string;
    icon: IconName;
    href: string;
    selected: boolean;
  } => Boolean(item));

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
            background="page"
            border="neutral-alpha-weak"
            radius="m-4"
            shadow="l"
            padding="4"
            horizontal="center"
            zIndex={1}
          >
            <Row
              gap="4"
              vertical="center"
              textVariant="body-default-s"
              suppressHydrationWarning
            >
              {navItems.flatMap((item, index) => {
                const toggle = (
                  <React.Fragment key={item.key}>
                    <Row s={{ hide: true }}>
                      <ToggleButton
                        prefixIcon={item.icon}
                        href={item.href}
                        label={item.label}
                        selected={item.selected}
                      />
                    </Row>
                    <Row hide s={{ hide: false }}>
                      <ToggleButton
                        prefixIcon={item.icon}
                        href={item.href}
                        selected={item.selected}
                      />
                    </Row>
                  </React.Fragment>
                );

                if (index === 0) {
                  return [toggle];
                }

                return [
                  <Line
                    key={`divider-${item.key}`}
                    background="neutral-alpha-medium"
                    vert
                    maxHeight="24"
                  />,
                  toggle,
                ];
              })}
              {display.themeSwitcher && (
                <>
                  <Line background="neutral-alpha-medium" vert maxHeight="24" />
                  <ThemeToggle />
                </>
              )}
            </Row>
          </Row>
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
