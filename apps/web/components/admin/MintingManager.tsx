"use client";

import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { callAdminFunction } from "@/utils/admin-client";
import { useToast } from "@/hooks/useToast";
import { useTelegramAuth } from "@/hooks/useTelegramAuth";
import { formatIsoDateTime } from "@/utils/isoFormat";
import { Sparkles } from "lucide-react";

interface ThemeMintRecord {
  id: string;
  mint_index: number;
  name: string;
  status: string;
  initiator: string | null;
  note: string | null;
  content_uri: string | null;
  priority: number | null;
  started_at: string | null;
  completed_at: string | null;
  updated_at: string;
}

interface StartMintingSuccess {
  ok: true;
  mint: ThemeMintRecord;
}

type StartMintingResponse =
  | StartMintingSuccess
  | { error?: string }
  | undefined;

type StatusBadgeVariant = BadgeProps["variant"];

function normalizeOptional(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function getStatusVariant(status: string): StatusBadgeVariant {
  switch (status) {
    case "completed":
      return "success";
    case "in_progress":
      return "warning";
    case "pending":
      return "secondary";
    default:
      return "outline";
  }
}

function formatStatus(status: string): string {
  if (!status) return "Unknown";
  return status
    .split("_")
    .filter(Boolean)
    .map((segment) => segment[0]?.toUpperCase() + segment.slice(1))
    .join(" ");
}

const MINTING_DISABLED_MESSAGE =
  "DCT minting is permanently disabled after the jetton admin ownership was renounced. Supply remains hard-capped at 100M DCT.";

export function MintingManager() {
  const { isAdmin } = useTelegramAuth();
  const { toast } = useToast();
  const [mintIndex, setMintIndex] = useState("");
  const [planName, setPlanName] = useState("");
  const [initiator, setInitiator] = useState("");
  const [note, setNote] = useState("");
  const [contentUri, setContentUri] = useState("");
  const [priority, setPriority] = useState("");
  const [lastMint, setLastMint] = useState<ThemeMintRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const mintingDisabled = true;
  const submitDisabled = mintingDisabled || !isAdmin || isSubmitting;

  const handleReset = () => {
    setPlanName("");
    setInitiator("");
    setNote("");
    setContentUri("");
    setPriority("");
    setError(null);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (mintingDisabled) {
      setError(MINTING_DISABLED_MESSAGE);
      return;
    }

    if (!isAdmin) {
      setError("Admin authentication is required to start a mint.");
      return;
    }

    const parsedMintIndex = Number.parseInt(mintIndex, 10);
    if (!Number.isInteger(parsedMintIndex) || parsedMintIndex < 0) {
      setError("Mint index must be a non-negative integer.");
      return;
    }

    const payload: Record<string, unknown> = {
      mintIndex: parsedMintIndex,
    };

    const planNameValue = normalizeOptional(planName);
    if (planNameValue) {
      payload.planName = planNameValue;
    }

    const initiatorValue = normalizeOptional(initiator);
    if (initiatorValue) {
      payload.initiator = initiatorValue;
    }

    const noteValue = normalizeOptional(note);
    if (noteValue) {
      payload.note = noteValue;
    }

    const contentUriValue = normalizeOptional(contentUri);
    if (contentUriValue) {
      payload.contentUri = contentUriValue;
    }

    const priorityValue = normalizeOptional(priority);
    if (priorityValue) {
      const numericPriority = Number(priorityValue);
      if (!Number.isFinite(numericPriority)) {
        setError("Priority must be a numeric value if provided.");
        return;
      }
      payload.priority = Math.trunc(numericPriority);
    }

    setIsSubmitting(true);
    try {
      const { data, error: functionError } = await callAdminFunction<
        StartMintingResponse
      >("START_MINTING", {
        method: "POST",
        body: payload,
      });

      if (functionError) {
        throw new Error(functionError.message);
      }

      const success = data && typeof data === "object" && "ok" in data &&
          (data as StartMintingSuccess).ok === true
        ? data as StartMintingSuccess
        : null;

      if (!success) {
        const errorMessage =
          data && typeof data === "object" && "error" in data &&
            typeof (data as { error?: unknown }).error === "string"
            ? (data as { error: string }).error
            : "Supabase did not return a mint record.";
        throw new Error(errorMessage);
      }

      setLastMint(success.mint);
      toast({
        title: "Mint started",
        description: `Theme Mint #${success.mint.mint_index} is now ${
          formatStatus(success.mint.status)
        }.`,
      });
    } catch (submissionError) {
      const message = submissionError instanceof Error
        ? submissionError.message
        : "Failed to start minting.";
      setError(message);
      toast({
        title: "Mint start failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border border-border/40 bg-card/70 shadow-inner">
        <CardHeader className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <Sparkles className="h-6 w-6 text-primary" aria-hidden="true" />
            </div>
            <div>
              <CardTitle>DCT minting locked</CardTitle>
              <CardDescription>
                Ownership has been renounced; the form remains for audit history
                but cannot submit new mint requests.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {mintingDisabled
            ? (
              <Alert>
                <AlertDescription>{MINTING_DISABLED_MESSAGE}</AlertDescription>
              </Alert>
            )
            : !isAdmin
            ? (
              <Alert variant="destructive">
                <AlertDescription>
                  Admin credentials are missing. Authenticate through the
                  Telegram operations console to enable minting controls.
                </AlertDescription>
              </Alert>
            )
            : null}

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="mint-index">Mint index</Label>
                <Input
                  id="mint-index"
                  type="number"
                  min={0}
                  step={1}
                  required
                  inputMode="numeric"
                  value={mintIndex}
                  onChange={(event) => setMintIndex(event.target.value)}
                  placeholder="e.g. 3"
                  disabled={mintingDisabled}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="plan-name">Plan name</Label>
                <Input
                  id="plan-name"
                  value={planName}
                  onChange={(event) => setPlanName(event.target.value)}
                  placeholder="Growth Theme Pass"
                  disabled={mintingDisabled}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="initiator">Initiator</Label>
                <Input
                  id="initiator"
                  value={initiator}
                  onChange={(event) => setInitiator(event.target.value)}
                  placeholder="ton://EQxxxxxxxx"
                  disabled={mintingDisabled}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Input
                  id="priority"
                  inputMode="numeric"
                  value={priority}
                  onChange={(event) => setPriority(event.target.value)}
                  placeholder="Higher numbers surface first"
                  disabled={mintingDisabled}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="content-uri">Content URI</Label>
              <Input
                id="content-uri"
                value={contentUri}
                onChange={(event) => setContentUri(event.target.value)}
                placeholder="ipfs://dynamic-capital/theme/genesis.json"
                disabled={mintingDisabled}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="note">Internal note</Label>
              <Textarea
                id="note"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Context for this mint (e.g. governance proposal link)."
                disabled={mintingDisabled}
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="submit"
                isLoading={!mintingDisabled && isSubmitting}
                disabled={submitDisabled}
              >
                {mintingDisabled ? "Minting disabled" : "Initiate mint"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleReset}
                disabled={isSubmitting || mintingDisabled}
              >
                Reset fields
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {lastMint && (
        <Card className="border border-primary/40 bg-primary/5">
          <CardHeader>
            <CardTitle>Latest mint status</CardTitle>
            <CardDescription>
              Supabase acknowledged Theme Mint #{lastMint.mint_index} on{" "}
              {formatIsoDateTime(lastMint.updated_at)}.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">
                  #{lastMint.mint_index} · {lastMint.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  Started {lastMint.started_at
                    ? formatIsoDateTime(lastMint.started_at)
                    : "Not recorded"}
                </p>
              </div>
              <Badge variant={getStatusVariant(lastMint.status)}>
                {formatStatus(lastMint.status)}
              </Badge>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1 text-sm">
                <p className="text-muted-foreground">Initiator</p>
                <p className="font-medium">{lastMint.initiator ?? "—"}</p>
              </div>
              <div className="space-y-1 text-sm">
                <p className="text-muted-foreground">Priority</p>
                <p className="font-medium">{lastMint.priority ?? "—"}</p>
              </div>
              <div className="space-y-1 text-sm md:col-span-2">
                <p className="text-muted-foreground">Content URI</p>
                <p className="font-medium break-all">
                  {lastMint.content_uri ?? "—"}
                </p>
              </div>
              <div className="space-y-1 text-sm md:col-span-2">
                <p className="text-muted-foreground">Internal note</p>
                <p className="font-medium whitespace-pre-wrap">
                  {lastMint.note ?? "—"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
