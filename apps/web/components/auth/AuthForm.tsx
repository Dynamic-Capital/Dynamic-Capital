"use client";

import { useMemo } from "react";

import {
  Button,
  Column,
  Heading,
  Row,
  Spinner,
  Tag,
  Text,
} from "@/components/dynamic-ui-system";

import { useAuth } from "@/hooks/useAuth";
import { useWalletConnect } from "@/hooks/useWalletConnect";

function formatAddress(address?: string | null): string {
  if (!address) return "Not connected";
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function formatLockUntil(lockUntil?: string | null): string | null {
  if (!lockUntil) return null;
  try {
    const date = new Date(lockUntil);
    if (Number.isNaN(date.getTime())) {
      return null;
    }
    return date.toLocaleString();
  } catch {
    return null;
  }
}

export function AuthForm() {
  const {
    wallet,
    tonProof,
    telegramInitData,
    subscription,
    loading,
    connecting,
    connect,
    disconnect,
    refreshSubscription,
  } = useAuth();
  const openWalletModal = useWalletConnect();

  const lockUntil = useMemo(
    () => formatLockUntil(subscription?.lockUntil),
    [subscription?.lockUntil],
  );

  const showTonProof = useMemo(() => {
    if (!tonProof) return null;
    try {
      const parsed = JSON.parse(tonProof) as Record<string, unknown>;
      if (parsed && typeof parsed === "object") {
        return JSON.stringify(parsed, null, 2);
      }
    } catch {
      return tonProof;
    }
    return tonProof;
  }, [tonProof]);

  const handleConnect = () => {
    if (wallet) return;
    if (openWalletModal) {
      openWalletModal();
    } else {
      void connect();
    }
  };

  return (
    <Column
      fillWidth
      horizontal="center"
      align="center"
      padding="xl"
      background="page"
      gap="32"
      style={{ minHeight: "100vh" }}
    >
      <Column
        maxWidth={32}
        fillWidth
        background="surface"
        border="neutral-alpha-medium"
        radius="l"
        padding="xl"
        gap="24"
        shadow="xl"
      >
        <Column gap="12" align="center">
          <Heading variant="display-strong-xs">Wallet login</Heading>
          <Text
            variant="body-default-m"
            onBackground="neutral-weak"
            align="center"
          >
            Connect a TON wallet to prove membership, unlock staking tiers, and
            manage your Dynamic Capital subscriptions.
          </Text>
        </Column>

        <Column gap="20">
          <Column gap="8">
            <Text variant="body-default-s" onBackground="neutral-weak">
              Wallet status
            </Text>
            <Row horizontal="between" vertical="center">
              <Text variant="body-default-m" weight="strong">
                {formatAddress(wallet?.address)}
              </Text>
              {loading
                ? <Spinner size="s" />
                : wallet
                ? (
                  <Tag size="s" variant="positive">
                    Connected
                  </Tag>
                )
                : (
                  <Tag size="s" variant="neutral">
                    Awaiting connection
                  </Tag>
                )}
            </Row>
            {wallet
              ? (
                <Text variant="body-default-s" onBackground="neutral-weak">
                  {wallet.walletAppName
                    ? `Connected via ${wallet.walletAppName}`
                    : `Chain: ${wallet.chain}`}
                </Text>
              )
              : null}
          </Column>

          <Column gap="12">
            <Text variant="body-default-s" onBackground="neutral-weak">
              Membership
            </Text>
            {subscription?.isActive
              ? (
                <Column
                  gap="8"
                  background="page"
                  border="brand-weak"
                  radius="m"
                  padding="m"
                >
                  <Text variant="body-default-m" weight="strong">
                    {subscription.plan ?? "Active stake"}
                  </Text>
                  <Text variant="body-default-s" onBackground="neutral-weak">
                    {subscription.stakedDct
                      ? `${subscription.stakedDct.toLocaleString()} DCT staked`
                      : "Stake detected"}
                  </Text>
                  {lockUntil
                    ? (
                      <Text
                        variant="body-default-s"
                        onBackground="neutral-weak"
                      >
                        Locked until {lockUntil}
                      </Text>
                    )
                    : null}
                  {subscription.daysRemaining != null
                    ? (
                      <Text
                        variant="body-default-s"
                        onBackground="neutral-weak"
                      >
                        {subscription.daysRemaining > 0
                          ? `${subscription.daysRemaining} days remaining`
                          : "Unlock window available"}
                      </Text>
                    )
                    : null}
                </Column>
              )
              : (
                <Column
                  gap="8"
                  background="page"
                  border="neutral-alpha-medium"
                  radius="m"
                  padding="m"
                >
                  <Text variant="body-default-m" weight="strong">
                    No active stake detected
                  </Text>
                  <Text variant="body-default-s" onBackground="neutral-weak">
                    Connect your wallet and complete a TON subscription to
                    enable VIP access and staking rewards.
                  </Text>
                </Column>
              )}
          </Column>

          <Column gap="12">
            <Row gap="12" wrap>
              <Button
                size="m"
                variant="secondary"
                data-border="rounded"
                disabled={Boolean(wallet) || connecting}
                onClick={handleConnect}
              >
                {connecting ? "Opening wallet…" : "Connect TON wallet"}
              </Button>
              {wallet
                ? (
                  <>
                    <Button
                      size="m"
                      variant="secondary"
                      data-border="rounded"
                      onClick={() => void refreshSubscription()}
                      disabled={loading}
                    >
                      Refresh status
                    </Button>
                    <Button
                      size="m"
                      variant="primary"
                      data-border="rounded"
                      onClick={() => void disconnect()}
                    >
                      Disconnect
                    </Button>
                  </>
                )
                : null}
            </Row>
          </Column>

          <Column gap="12">
            <Text variant="body-default-s" onBackground="neutral-weak">
              Session details
            </Text>
            {showTonProof
              ? (
                <Column
                  gap="8"
                  background="page"
                  border="neutral-alpha-medium"
                  radius="m"
                  padding="m"
                  style={{ maxHeight: 200, overflowY: "auto" }}
                >
                  <Text variant="body-default-xs" onBackground="neutral-weak">
                    TON proof payload
                  </Text>
                  <Text
                    as="pre"
                    variant="body-default-xs"
                    onBackground="neutral-weak"
                    style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}
                  >
                    {showTonProof}
                  </Text>
                </Column>
              )
              : (
                <Text variant="body-default-s" onBackground="neutral-weak">
                  Connect a wallet that shares TON proof to mint a verifiable
                  login session.
                </Text>
              )}
            {telegramInitData
              ? (
                <Tag size="s" variant="brand">
                  Telegram init data detected
                </Tag>
              )
              : (
                <Text variant="body-default-xs" onBackground="neutral-weak">
                  Optional: launch from the Telegram Mini App to link chat
                  identity with your wallet session automatically.
                </Text>
              )}
          </Column>
        </Column>
      </Column>
    </Column>
  );
}

export default AuthForm;
