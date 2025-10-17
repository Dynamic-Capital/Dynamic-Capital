"use client";

import { Badge, Button, Row, StatusIndicator, Text } from "@once-ui-system/core";

import type { CSSProperties } from "react";

type SyncBannerProps = {
  description: string;
  isSyncing: boolean;
  countdown: number | null;
  onRefresh: () => void;
  refreshLabel?: string;
  disabled?: boolean;
};

const INDICATOR_PULSE: CSSProperties = {
  animation: "syncPulse 2.4s ease-in-out infinite",
};

export function SyncBanner({
  description,
  isSyncing,
  countdown,
  onRefresh,
  refreshLabel = "Refresh",
  disabled,
}: SyncBannerProps) {
  return (
    <Row
      as="div"
      gap="12"
      wrap
      paddingX="16"
      paddingY="12"
      radius="l"
      border="brand-alpha-medium"
      background="brand-alpha-weak"
      vertical="center"
      horizontal="start"
      data-testid="sync-banner"
    >
      <StatusIndicator
        size="s"
        color="cyan"
        ariaLabel={isSyncing ? "Feed updating" : "Feed ready"}
        style={isSyncing ? INDICATOR_PULSE : undefined}
      />
      <Badge effect={false} onBackground="brand-strong" background="brand-alpha-weak">
        <Text
          as="span"
          variant="label-strong-s"
          style={{ textTransform: "uppercase", letterSpacing: "0.08em" }}
        >
          Live feed
        </Text>
      </Badge>
      <Text as="span" weight="strong" onBackground="brand-strong">
        {description}
      </Text>
      {countdown !== null && (
        <Text as="span" weight="strong" aria-live="polite" onBackground="brand-strong">
          {isSyncing ? "Updating…" : `Next sync in ${countdown}s`}
        </Text>
      )}
      <Button
        type="button"
        variant="tertiary"
        size="s"
        onClick={onRefresh}
        disabled={disabled ?? isSyncing}
        label={refreshLabel}
      />
    </Row>
  );
}
