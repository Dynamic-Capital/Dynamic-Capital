"use client";

import React, { useState } from "react";

import {
  Button,
  Column,
  Heading,
  Input,
  Row,
  Spinner,
  Tag,
  Text,
} from "@/components/dynamic-ui-system";
import { useToast } from "@/hooks/useToast";
import { useTelegramAuth } from "@/hooks/useTelegramAuth";

interface AdminGateProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function AdminGate({ children, fallback }: AdminGateProps) {
  const {
    isAdmin,
    initData,
    loading,
    adminSession,
    validatingAdminSession,
    adminSessionError,
    establishAdminSession,
  } = useTelegramAuth();
  const { toast } = useToast();
  const [manualInitData, setManualInitData] = useState("");
  const [manualAdminToken, setManualAdminToken] = useState("");
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const isCheckingAccess = loading || validatingAdminSession;

  if (isCheckingAccess) {
    return (
      <Column
        fillWidth
        horizontal="center"
        align="center"
        gap="16"
        padding="xl"
        style={{ minHeight: "60vh" }}
      >
        <Spinner />
        <Text variant="body-default-m">Checking admin access…</Text>
      </Column>
    );
  }

  if (isAdmin && (initData || adminSession)) {
    return <>{children}</>;
  }

  const authenticateWithInitData = async (data: string) => {
    setIsAuthenticating(true);
    try {
      const result = await establishAdminSession({ initData: data });
      if (result.ok) {
        setManualInitData("");
        toast({
          title: "Authenticated",
          description: "Admin privileges unlocked",
        });
      } else {
        throw new Error(result.error ?? "Authentication failed");
      }
    } catch (err) {
      console.error("Admin auth failed", err);
      toast({
        title: "Authentication failed",
        description: err instanceof Error
          ? err.message
          : "Unable to authenticate admin session",
        variant: "destructive",
      });
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleManualAuth = () => {
    if (!manualInitData.trim()) {
      toast({
        title: "Missing initData",
        description: "Paste valid Telegram initData to continue",
        variant: "destructive",
      });
      return;
    }
    void authenticateWithInitData(manualInitData.trim());
  };

  const handleManualTokenAuth = async () => {
    const trimmedToken = manualAdminToken.trim();
    if (!trimmedToken) {
      toast({
        title: "Missing admin token",
        description: "Enter an admin token to continue",
        variant: "destructive",
      });
      return;
    }

    const result = await establishAdminSession({ token: trimmedToken });
    if (result.ok) {
      setManualAdminToken("");
      toast({
        title: "Admin token accepted",
        description: "Admin privileges unlocked",
      });
    } else {
      toast({
        title: "Token rejected",
        description: result.error ?? "Unable to validate admin token",
        variant: "destructive",
      });
    }
  };

  const openInTelegram = () => {
    window.open("https://t.me/DynamicCapitalBot/app", "_blank");
  };

  const copyInitData = () => {
    if (!initData) {
      return;
    }
    void navigator.clipboard.writeText(initData);
    toast({
      title: "Copied",
      description: "Telegram initData copied to clipboard",
    });
  };

  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <Column
      fillWidth
      horizontal="center"
      align="center"
      padding="xl"
      gap="24"
      background="page"
      style={{ minHeight: "100vh" }}
    >
      <Column
        maxWidth={28}
        fillWidth
        background="surface"
        border="neutral-alpha-medium"
        radius="l"
        padding="xl"
        gap="24"
        shadow="xl"
      >
        <Column gap="12" align="center">
          <Heading variant="display-strong-xs">Admin access required</Heading>
          <Text
            variant="body-default-m"
            onBackground="neutral-weak"
            align="center"
          >
            Authenticate with Telegram initData or an existing admin token to
            open the control room.
          </Text>
          {adminSessionError
            ? (
              <Text
                variant="body-default-s"
                onBackground="neutral-strong"
                align="center"
              >
                {adminSessionError}
              </Text>
            )
            : null}
        </Column>
        <Column gap="16">
          <Button
            size="m"
            variant="secondary"
            data-border="rounded"
            onClick={openInTelegram}
          >
            Open in Telegram
          </Button>
          {initData
            ? (
              <Column
                gap="12"
                background="page"
                border="neutral-alpha-weak"
                radius="m"
                padding="m"
              >
                <Row horizontal="between" vertical="center">
                  <Tag size="s" prefixIcon="telegram">
                    initData detected
                  </Tag>
                  <Button
                    size="s"
                    variant="secondary"
                    data-border="rounded"
                    onClick={copyInitData}
                  >
                    Copy
                  </Button>
                </Row>
                <Button
                  size="m"
                  variant="secondary"
                  data-border="rounded"
                  onClick={() => authenticateWithInitData(initData)}
                  disabled={isAuthenticating || validatingAdminSession}
                >
                  {isAuthenticating
                    ? "Authenticating…"
                    : "Authenticate via Telegram"}
                </Button>
              </Column>
            )
            : null}
          <Column gap="8">
            <Text variant="body-default-s" onBackground="neutral-weak">
              Paste Telegram initData
            </Text>
            <Input
              id="manual-init-data"
              value={manualInitData}
              onChange={(event) => setManualInitData(event.target.value)}
              placeholder="Paste initData here"
              aria-label="Manual initData"
            />
            <Button
              size="m"
              variant="secondary"
              data-border="rounded"
              onClick={handleManualAuth}
              disabled={!manualInitData.trim() || isAuthenticating ||
                validatingAdminSession}
            >
              {isAuthenticating ? "Authenticating…" : "Manual authentication"}
            </Button>
          </Column>
          <Column gap="8">
            <Row horizontal="between" vertical="center">
              <Text variant="body-default-s" onBackground="neutral-weak">
                Use admin token
              </Text>
            </Row>
            <Input
              id="manual-admin-token"
              value={manualAdminToken}
              onChange={(event) => setManualAdminToken(event.target.value)}
              placeholder="Enter admin token"
              aria-label="Manual admin token"
            />
            <Button
              size="m"
              variant="secondary"
              data-border="rounded"
              onClick={handleManualTokenAuth}
              disabled={!manualAdminToken.trim() || validatingAdminSession}
            >
              {validatingAdminSession ? "Validating…" : "Validate admin token"}
            </Button>
          </Column>
        </Column>
      </Column>
    </Column>
  );
}

export default AdminGate;
