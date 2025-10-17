"use client";

import { Button, Text, useToast } from "@once-ui-system/core";
import classNames from "classnames";

import styles from "./ChatLauncher.module.scss";

type ChatLauncherProps = {
  compact: boolean;
  onOpen: () => void;
};

export function ChatLauncher({ compact, onOpen }: ChatLauncherProps) {
  const { addToast } = useToast();

  const handleClick = () => {
    onOpen();
    addToast({
      variant: "success",
      message: (
        <Text as="span" variant="label-strong-s">
          Desk concierge is ready — we&apos;ll follow up in minutes.
        </Text>
      ),
    });
  };

  return (
    <div
      className={classNames(styles.launcher, compact && styles.compact)}
      data-state={compact ? "compact" : "expanded"}
    >
      <Button
        variant="primary"
        size={compact ? "s" : "m"}
        className={classNames(styles.button, compact && styles.buttonCompact)}
        aria-label="Open desk concierge chat"
        onClick={handleClick}
      >
        <span className={styles.icon} aria-hidden>
          <ChatIcon />
        </span>
        <span className={styles.copy} aria-hidden={compact}>
          <span className={styles.title}>Write to start up</span>
          <span className={styles.subtitle}>Desk concierge on call</span>
        </span>
      </Button>
    </div>
  );
}

function ChatIcon() {
  return (
    <svg viewBox="0 0 24 24" role="presentation" aria-hidden focusable="false">
      <path
        d="M4.25 4.5h15.5a1.75 1.75 0 0 1 1.75 1.75v8.5a1.75 1.75 0 0 1-1.75 1.75H13l-3.9 3.4a.75.75 0 0 1-1.25-.56V16.5H4.25A1.75 1.75 0 0 1 2.5 14.75v-8.5A1.75 1.75 0 0 1 4.25 4.5Z"
        fill="currentColor"
        fillRule="evenodd"
        clipRule="evenodd"
      />
    </svg>
  );
}

export default ChatLauncher;
