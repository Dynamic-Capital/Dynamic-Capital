"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import {
  Button,
  Column,
  Fade,
  Flex,
  Line,
  Row,
  Text,
  ToggleButton,
} from "@/components/dynamic-ui-system";

import { display, isRouteEnabled, person } from "@/resources";
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

  const navBlueprint = [
    {
      key: "start",
      route: "/",
      step: "Step 1",
      label: "Start here",
      description: "Follow the guided tour and set your first goal.",
      icon: "sparkles" as IconName,
      href: "/",
      isActive: (currentPath: string) => currentPath === "/",
    },
    {
      key: "learn",
      route: "/blog",
      step: "Step 2",
      label: "Learn the basics",
      description: "Browse beginner-friendly lessons from the desk.",
      icon: "book" as IconName,
      href: "/blog",
      isActive: (currentPath: string) => currentPath.startsWith("/blog"),
    },
    {
      key: "plans",
      route: "/plans",
      step: "Step 3",
      label: "Choose a plan",
      description: "Compare membership paths when you're ready to join.",
      icon: "crown" as IconName,
      href: "/plans",
      isActive: (currentPath: string) => currentPath.startsWith("/plans"),
    },
    {
      key: "results",
      route: "/work",
      step: "Step 4",
      label: "See real results",
      description: "Review live desk projects and member wins.",
      icon: "grid" as IconName,
      href: "/work",
      isActive: (currentPath: string) => currentPath.startsWith("/work"),
    },
    {
      key: "automation",
      route: "/telegram",
      step: "Step 5",
      label: "Automation hub",
      description: "Connect signals and manage the Telegram bot.",
      icon: "telegram" as IconName,
      href: "/telegram",
      isActive: (currentPath: string) => currentPath.startsWith("/telegram"),
    },
  ] as const;

  const navItems = navBlueprint
    .filter((item) => isRouteEnabled(item.route))
    .map((item) => ({
      key: item.key,
      label: item.label,
      icon: item.icon,
      href: item.href,
      step: item.step,
      description: item.description,
      ariaLabel: `${item.step}: ${item.label}. ${item.description}`,
      selected: item.isActive(pathname),
    }));

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
                    <Column
                      key={`${item.key}-desktop`}
                      s={{ hide: true }}
                      gap="4"
                      horizontal="center"
                      align="center"
                    >
                      <Text
                        variant="label-strong-xs"
                        align="center"
                        onBackground={item.selected
                          ? "brand-strong"
                          : "neutral-weak"}
                      >
                        {item.step}
                      </Text>
                      <ToggleButton
                        prefixIcon={item.icon}
                        href={item.href}
                        label={item.label}
                        selected={item.selected}
                        aria-label={item.ariaLabel}
                      />
                      <Text
                        variant="body-default-xs"
                        align="center"
                        onBackground="neutral-weak"
                        style={{ maxWidth: "14rem" }}
                      >
                        {item.description}
                      </Text>
                    </Column>
                    <Row hide s={{ hide: false }}>
                      <ToggleButton
                        prefixIcon={item.icon}
                        href={item.href}
                        selected={item.selected}
                        aria-label={item.ariaLabel}
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
