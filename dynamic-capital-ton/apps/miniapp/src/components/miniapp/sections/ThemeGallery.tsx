"use client";

import {
  Badge,
  Button,
  Card,
  Column,
  Flex,
  Grid,
  Text,
} from "@once-ui-system/core";

import { resolveThemeSwatches } from "@/components/miniapp/home/model";

import type { MiniAppThemeOption } from "@shared/miniapp/theme-loader";

const SWATCH_LABELS = ["Background", "Accent", "Text"] as const;

function ThemeSwatch({ color, label }: { color: string; label: string }) {
  return (
    <Column gap="xs" horizontal="center">
      <div
        role="img"
        aria-label={`${label} swatch ${color}`}
        style={{
          width: "2.5rem",
          height: "2.5rem",
          borderRadius: "999px",
          border: "1px solid rgba(148, 163, 184, 0.35)",
          boxShadow: "0 10px 22px rgba(15, 23, 42, 0.32)",
          background: color,
        }}
      />
      <Text variant="body-default-xs" onBackground="neutral-weak">
        {label}
      </Text>
      <Text
        variant="code-default-xs"
        onBackground="neutral-weak"
        style={{ wordBreak: "break-all" }}
      >
        {color}
      </Text>
    </Column>
  );
}

export type ThemeGalleryProps = {
  themes: MiniAppThemeOption[];
  activeThemeId: string | null;
  isBusy: boolean;
  onApply: (theme: MiniAppThemeOption) => void;
  onReset: () => void;
  statusMessage: string | null;
  walletConnected: boolean;
};

export function ThemeGallery({
  themes,
  activeThemeId,
  isBusy,
  onApply,
  onReset,
  statusMessage,
  walletConnected,
}: ThemeGalleryProps) {
  return (
    <Column as="section" id="appearance" gap="l">
      <Column gap="s">
        <Text variant="code-strong-s" onBackground="brand-strong">
          Appearance
        </Text>
        <Text variant="heading-strong-l">Apply partner themes without leaving the desk</Text>
        <Text variant="body-default-m" onBackground="neutral-weak">
          Theme NFTs adapt the interface instantly. Connect your wallet to view collectibles and preview them live.
        </Text>
      </Column>

      {!walletConnected && (
        <Card background="neutral-alpha-weak" radius="l" padding="m">
          <Text variant="body-default-s" onBackground="neutral-weak">
            Connect a TON wallet to see eligible themes.
          </Text>
        </Card>
      )}

      {walletConnected && themes.length === 0 && (
        <Card background="neutral-alpha-weak" radius="l" padding="m">
          <Text variant="body-default-s" onBackground="neutral-weak">
            No Theme NFTs detected yet. Mint a theme to unlock personalization.
          </Text>
        </Card>
      )}

      <Grid columns="3" gap="m" m={{ columns: "1" }}>
        {themes.map((theme) => {
          const isActive = theme.id === activeThemeId;
          const swatches = resolveThemeSwatches(theme);
          return (
            <Card
              key={theme.id}
              background="surface"
              border={isActive ? "brand-alpha-medium" : "neutral-alpha-weak"}
              radius="l"
              padding="l"
            >
              <Column gap="m">
                <Flex direction="row" horizontal="between" vertical="center">
                  <Text variant="heading-strong-m">{theme.label}</Text>
                  {isActive && (
                    <Badge textVariant="body-default-xs" background="brand-alpha-weak" onBackground="brand-strong">
                      Active
                    </Badge>
                  )}
                </Flex>
                {theme.description && (
                  <Text variant="body-default-s" onBackground="neutral-weak">
                    {theme.description}
                  </Text>
                )}
                <Column gap="xs">
                  <Text variant="body-default-xs" onBackground="neutral-weak">
                    Palette
                  </Text>
                  <Grid columns="3" gap="s" s={{ columns: "3" }}>
                    {swatches.map((color, index) => (
                      <ThemeSwatch
                        key={`${theme.id}-swatch-${color}-${index}`}
                        color={color}
                        label={SWATCH_LABELS[index] ?? `Color ${index + 1}`}
                      />
                    ))}
                  </Grid>
                </Column>
                <Column gap="xs">
                  <Text variant="body-default-xs" onBackground="neutral-weak">
                    NFT address
                  </Text>
                  <Text variant="body-strong-s" onBackground="neutral-weak" style={{ wordBreak: "break-all" }}>
                    {theme.nftAddress}
                  </Text>
                </Column>
                <Flex direction="row" gap="s">
                  <Button
                    variant="primary"
                    size="s"
                    onClick={() => onApply(theme)}
                    disabled={isBusy || isActive}
                    loading={isBusy && !isActive}
                  >
                    {isActive ? "Applied" : "Preview theme"}
                  </Button>
                  {isActive && (
                    <Button
                      variant="tertiary"
                      size="s"
                      onClick={onReset}
                      disabled={isBusy}
                    >
                      Reset
                    </Button>
                  )}
                </Flex>
              </Column>
            </Card>
          );
        })}
      </Grid>

      {statusMessage && (
        <Text variant="body-default-s" onBackground="neutral-weak">
          {statusMessage}
        </Text>
      )}
    </Column>
  );
}
