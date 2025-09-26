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

import { callEdgeFunction } from "@/config/supabase";
import { useToast } from "@/hooks/useToast";
import { useTelegramAuth } from "@/hooks/useTelegramAuth";

interface AdminGateProps {
  children: React.ReactNode;
}

const ADMIN_STORAGE_KEY = "dc_admin_token";

export function AdminGate({ children }: AdminGateProps) {
  const { isAdmin, initData, loading } = useTelegramAuth();
  const { toast } = useToast();
  const [manualInitData, setManualInitData] = useState("");
  const [adminToken, setAdminToken] = useState(() =>
    localStorage.getItem(ADMIN_STORAGE_KEY)
  );
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const hasValidToken = () => {
    if (!adminToken) {
      return false;
    }
    try {
      const payload = JSON.parse(atob(adminToken.split(".")[1])) as {
        exp?: number;
        admin?: boolean;
      };
      return Boolean(payload?.admin) &&
        Number(payload?.exp) > Date.now() / 1000;
    } catch {
      return false;
    }
  };

  if (loading) {
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

  if ((isAdmin && initData) || hasValidToken()) {
    return <>{children}</>;
  }

  const authenticateWithInitData = async (data: string) => {
    setIsAuthenticating(true);
    try {
      const { data: response, error } = await callEdgeFunction<
        { token?: string; error?: string }
      >("ADMIN_SESSION", {
        method: "POST",
        body: { initData: data },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (response?.token) {
        localStorage.setItem(ADMIN_STORAGE_KEY, response.token);
        setAdminToken(response.token);
        toast({
          title: "Authenticated",
          description: "Admin privileges unlocked",
        });
      } else {
        throw new Error(response?.error || "Authentication failed");
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
                  disabled={isAuthenticating}
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
              disabled={!manualInitData.trim() || isAuthenticating}
            >
              {isAuthenticating ? "Authenticating…" : "Manual authentication"}
            </Button>
          </Column>
        </Column>
      </Column>
    </Column>
  );
}

export default AdminGate;
