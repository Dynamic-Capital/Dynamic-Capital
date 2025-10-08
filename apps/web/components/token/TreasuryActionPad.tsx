"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Check, Copy } from "lucide-react";

import {
  Column,
  Heading,
  Icon,
  Row,
  Tag,
  Text,
} from "@/components/dynamic-ui-system";
import type { IconName } from "@/components/dynamic-ui-system";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TonkeeperDeepLinkButtons } from "@/components/web3/TonkeeperDeepLinkButtons";
import { useToast } from "@/hooks/useToast";
import { cn } from "@/utils";
import {
  type DctActionDefinition,
  type DctActionPadDefinition,
  type DctCopyFieldDefinition,
} from "@shared/ton/dct-action-pad";

import { shortenTonAddress } from "@/resources";

type TreasuryActionPadProps = {
  pad: DctActionPadDefinition;
};

function CopyFieldButton({
  field,
  onCopy,
  copied,
}: {
  field: DctCopyFieldDefinition;
  onCopy: (field: DctCopyFieldDefinition) => Promise<void>;
  copied: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <Button
        type="button"
        variant="outline"
        className="justify-start gap-2"
        onClick={() => onCopy(field)}
      >
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        <span className="font-semibold">{field.label}</span>
      </Button>
      {field.helper
        ? <p className="text-xs text-muted-foreground">{field.helper}</p>
        : null}
    </div>
  );
}

function ActionHighlights({ highlights }: { highlights: readonly string[] }) {
  if (highlights.length === 0) {
    return null;
  }

  return (
    <Column gap="8" as="ul">
      {highlights.map((highlight) => (
        <Row
          key={highlight}
          gap="12"
          as="li"
          horizontal="start"
          className="items-start"
        >
          <span className="mt-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-primary">
            <Icon name="check" size="s" />
          </span>
          <Text variant="body-default-m" onBackground="neutral-strong">
            {highlight}
          </Text>
        </Row>
      ))}
    </Column>
  );
}

function ActionLinks({
  links,
}: {
  links: DctActionDefinition["links"];
}) {
  if (links.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {links.map((link) => {
        const content = (
          <span className="flex items-center gap-2">
            {link.label}
            {link.external ? <Icon name="arrowUpRight" size="xs" /> : null}
          </span>
        );

        return link.external
          ? (
            <Button
              key={link.href}
              asChild
              variant="outline"
              className="gap-2"
            >
              <a href={link.href} target="_blank" rel="noreferrer">
                {content}
              </a>
            </Button>
          )
          : (
            <Button key={link.href} asChild variant="outline" className="gap-2">
              <Link href={link.href}>{content}</Link>
            </Button>
          );
      })}
    </div>
  );
}

function renderActionDescription(action: DctActionDefinition) {
  return (
    <Column gap="12">
      <Column gap="4">
        <Heading variant="heading-strong-m">{action.summary}</Heading>
        <Text variant="body-default-m" onBackground="neutral-weak">
          {action.description}
        </Text>
      </Column>
      <ActionHighlights highlights={action.highlights} />
      <ActionLinks links={action.links} />
    </Column>
  );
}

export function TreasuryActionPad({ pad }: TreasuryActionPadProps) {
  const { toast } = useToast();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current);
    }
  }, []);

  const walletLabel = useMemo(
    () => shortenTonAddress(pad.walletAddress),
    [pad.walletAddress],
  );

  const handleCopy = async (field: DctCopyFieldDefinition) => {
    try {
      await navigator.clipboard.writeText(field.value);
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current);
      }
      setCopiedKey(field.key);
      resetTimerRef.current = setTimeout(() => {
        setCopiedKey(null);
      }, 2000);
      toast({
        title: "Copied",
        description: `${field.label} copied to clipboard.`,
      });
    } catch (error) {
      console.error("[TreasuryActionPad] Copy failed", error);
      toast({
        title: "Copy not available",
        description:
          "Your browser blocked clipboard access. Please copy manually.",
        variant: "destructive",
      });
    }
  };

  return (
    <Column
      gap="20"
      padding="24"
      radius="xl"
      background="surface"
      border="brand-alpha-medium"
      className="w-full shadow-xl shadow-primary/10"
    >
      <Column gap="8">
        <Row gap="8" wrap>
          <Tag size="s" background="brand-alpha-weak" prefixIcon="globe">
            {pad.alias}
          </Tag>
          <Tag size="s" background="neutral-alpha-medium" prefixIcon="wallet">
            Treasury {walletLabel}
          </Tag>
        </Row>
        <Text variant="body-default-s" onBackground="neutral-weak">
          Switch between onboarding, deposit, withdrawal, and liquidity flows in
          one place so every investor follows the same Dynamic Capital playbook.
        </Text>
      </Column>

      <Tabs defaultValue={pad.defaultActionKey} className="w-full">
        <div className="flex flex-col gap-6 lg:flex-row">
          <TabsList
            orientation="vertical"
            aria-label="Dynamic Capital treasury actions"
            animateIndicator
            className="flex w-full flex-col gap-2 bg-transparent p-0 lg:max-w-[280px]"
          >
            {pad.actions.map((action) => (
              <TabsTrigger
                key={action.key}
                value={action.key}
                className={cn(
                  "w-full justify-start gap-3 rounded-xl border border-transparent px-4 py-3 text-left transition-colors",
                  "data-[state=active]:border-primary/60 data-[state=active]:bg-primary/10",
                )}
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-primary">
                  <Icon name={action.icon as IconName} />
                </span>
                <span className="flex flex-col text-left">
                  <span className="text-sm font-semibold text-foreground">
                    {action.label}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {action.summary}
                  </span>
                </span>
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="flex-1">
            {pad.actions.map((action) => (
              <TabsContent key={action.key} value={action.key} className="mt-0">
                <Column
                  gap="16"
                  className="rounded-xl border border-primary/20 bg-background/40 p-6"
                >
                  {action.key === "deposit"
                    ? (
                      <Column gap="16">
                        <TonkeeperDeepLinkButtons
                          address={pad.walletAddress}
                          jettonAddress={pad.jettonMasterAddress}
                          memo={pad.memo}
                          className="w-full"
                        />
                        <div className="grid gap-3 sm:grid-cols-2">
                          {pad.copyFields.map((field) => (
                            <CopyFieldButton
                              key={field.key}
                              field={field}
                              copied={copiedKey === field.key}
                              onCopy={handleCopy}
                            />
                          ))}
                        </div>
                      </Column>
                    )
                    : null}
                  {renderActionDescription(action)}
                </Column>
              </TabsContent>
            ))}
          </div>
        </div>
      </Tabs>
    </Column>
  );
}

export default TreasuryActionPad;
