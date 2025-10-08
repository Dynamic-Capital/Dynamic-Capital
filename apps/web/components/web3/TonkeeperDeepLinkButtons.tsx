"use client";

import { useEffect, useMemo, useState } from "react";

import { cn } from "@/utils";
import { Button } from "@/components/ui/button";

import {
  buildDynamicTransferLink,
  resolveTonkeeperScheme,
  TON_STANDARD_SCHEME,
  TONKEEPER_UNIVERSAL_SCHEME,
  type TonkeeperTransferOptions,
} from "../../../../shared/ton/tonkeeper";

type NumericLike = string | number | bigint | null | undefined;

type TonkeeperDeepLinkButtonsProps = {
  address: string;
  amountNano?: NumericLike;
  memo?: string | null;
  jettonAddress?: string | null;
  binaryPayload?: string | null;
  expiresAt?: NumericLike;
  className?: string;
};

function normalizeNumeric(value: NumericLike): string | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? trimmed : undefined;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return undefined;
    return Math.trunc(value).toString(10);
  }
  return value.toString(10);
}

function normalizeString(value?: string | null): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function resolvePlatformHint(): string | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }

  const telegramPlatform = (window as unknown as {
    Telegram?: { WebApp?: { platform?: string } };
  }).Telegram?.WebApp?.platform;

  if (telegramPlatform && telegramPlatform.trim().length > 0) {
    return telegramPlatform;
  }

  if (typeof navigator !== "undefined") {
    return navigator.platform;
  }

  return undefined;
}

export function TonkeeperDeepLinkButtons({
  address,
  amountNano,
  memo,
  jettonAddress,
  binaryPayload,
  expiresAt,
  className,
}: TonkeeperDeepLinkButtonsProps) {
  const sanitizedAddress = address.trim();

  const normalizedAmount = normalizeNumeric(amountNano);
  const normalizedMemo = normalizeString(memo ?? undefined);
  const normalizedJetton = normalizeString(jettonAddress ?? undefined);
  const normalizedPayload = normalizeString(binaryPayload ?? undefined);
  const normalizedExpiry = normalizeNumeric(expiresAt);

  const baseOptions = useMemo<TonkeeperTransferOptions | null>(
    () =>
      sanitizedAddress
        ? {
          address: sanitizedAddress,
          amount: normalizedAmount,
          text: normalizedMemo,
          jetton: normalizedJetton,
          bin: normalizedPayload,
          exp: normalizedExpiry,
        }
        : null,
    [
      sanitizedAddress,
      normalizedAmount,
      normalizedMemo,
      normalizedJetton,
      normalizedPayload,
      normalizedExpiry,
    ],
  );

  const defaultLink = useMemo(
    () =>
      baseOptions
        ? buildDynamicTransferLink(TONKEEPER_UNIVERSAL_SCHEME, baseOptions)
        : null,
    [baseOptions],
  );

  const tonLink = useMemo(
    () =>
      baseOptions
        ? buildDynamicTransferLink(TON_STANDARD_SCHEME, baseOptions)
        : null,
    [baseOptions],
  );

  const [primaryLink, setPrimaryLink] = useState(defaultLink ?? "");

  useEffect(() => {
    if (!baseOptions || !defaultLink) {
      setPrimaryLink("");
      return;
    }

    const nav = typeof navigator !== "undefined" ? navigator : undefined;
    const userAgent = nav?.userAgent ?? undefined;
    const userAgentData = nav && "userAgentData" in nav
      ? (nav as unknown as { userAgentData?: { mobile?: boolean } })
        .userAgentData
      : undefined;
    const isMobileHint = typeof userAgentData?.mobile === "boolean"
      ? userAgentData.mobile
      : undefined;

    const platformHint = resolvePlatformHint();

    const scheme = resolveTonkeeperScheme({
      prefersApp: true,
      userAgent: userAgent ?? null,
      platform: platformHint ?? null,
      isMobile: isMobileHint,
    });

    try {
      setPrimaryLink(buildDynamicTransferLink(scheme, baseOptions));
    } catch (error) {
      console.error("[TonkeeperDeepLink] Failed to build dynamic link", error);
      setPrimaryLink(defaultLink);
    }
  }, [baseOptions, defaultLink]);

  if (!baseOptions || !defaultLink || !tonLink) {
    return null;
  }

  return (
    <div className={cn("flex w-full flex-col items-center gap-2", className)}>
      <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
        <Button
          href={primaryLink}
          rel="noreferrer"
          variant="brand"
          responsive
          fullWidth
        >
          Open in Tonkeeper
        </Button>
        <Button
          href={defaultLink}
          target="_blank"
          rel="noreferrer"
          variant="outline"
          responsive
          fullWidth
        >
          Try universal link
        </Button>
      </div>
      <p className="text-center text-xs text-muted-foreground">
        Need a cross-wallet URI?{" "}
        <a
          href={tonLink}
          className="font-medium underline underline-offset-4"
          rel="noreferrer"
        >
          Use the ton:// variant
        </a>
        .
      </p>
    </div>
  );
}
