"use client";

import { Button, Card, Column, Spinner, Text } from "@once-ui-system/core";
import { TonConnectUIProvider } from "@tonconnect/ui-react";

import { TONCONNECT_WALLETS_LIST_CONFIGURATION } from "@shared/ton/tonconnect-wallets";

import {
  HomeContent,
  TONCONNECT_ACTIONS_CONFIGURATION,
  useTonConnectManifestUrl,
} from "@/components/miniapp/home/HomeContent";

export default function Page() {
  const { manifestUrl, resolving, error, retry } = useTonConnectManifestUrl();

  if (!manifestUrl) {
    return (
      <Column as="main" padding="xl" gap="l" align="center" horizontal="center">
        <Spinner size="m" />
        <Text variant="body-default-m" onBackground="neutral-weak">
          Resolving TON Connect manifest…
        </Text>
      </Column>
    );
  }

  return (
    <TonConnectUIProvider
      manifestUrl={manifestUrl}
      walletsListConfiguration={TONCONNECT_WALLETS_LIST_CONFIGURATION}
      actionsConfiguration={TONCONNECT_ACTIONS_CONFIGURATION}
    >
      <Column gap="m">
        {error && (
          <Card
            background="warning-alpha-weak"
            border="warning-alpha-medium"
            radius="l"
            padding="m"
            gap="s"
          >
            <Text variant="body-strong-m" onBackground="warning-strong">
              Using fallback TON Connect manifest
            </Text>
            <Text variant="body-default-s" onBackground="neutral-weak">
              {error}
            </Text>
            <Button
              variant="tertiary"
              size="s"
              weight="strong"
              onClick={retry}
              loading={resolving}
            >
              Retry
            </Button>
          </Card>
        )}
        <HomeContent />
      </Column>
    </TonConnectUIProvider>
  );
}
