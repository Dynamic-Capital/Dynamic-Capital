"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Icon } from "@/components/ui/icon";
import { useToast } from "@/hooks/useToast";
import { Separator } from "@/components/ui/separator";
import { SUPABASE_CONFIG } from "@/config/supabase";

interface HealthStatus {
  status: "healthy" | "warning" | "error" | "loading";
  message: string;
  details?: Record<string, any>;
}

interface LinkageAudit {
  projectRef: string;
  expectedFunctionsHost: string;
  expectedWebhookUrl: string;
  currentWebhookUrl: string;
  miniAppUrl: string;
  sameHost_webhook_vs_functions: boolean;
  sameHost_mini_vs_functions: boolean;
  env: Record<string, boolean>;
}

export const SystemHealth = () => {
  const { toast } = useToast();
  const [miniAppStatus, setMiniAppStatus] = useState<HealthStatus>({
    status: "loading",
    message: "Checking...",
  });
  const [linkageAudit, setLinkageAudit] = useState<HealthStatus>({
    status: "loading",
    message: "Checking...",
  });
  const [webhookStatus, setWebhookStatus] = useState<HealthStatus>({
    status: "loading",
    message: "Checking...",
  });
  const [adminSecret, setAdminSecret] = useState("");
  const [isDryRun, setIsDryRun] = useState(true);
  const [isFixing, setIsFixing] = useState(false);

  const functionsHost = SUPABASE_CONFIG.FUNCTIONS_URL;
  const projectRef = (() => {
    try {
      const hostname = new URL(SUPABASE_CONFIG.URL).hostname;
      return hostname.split(".")[0] || "project";
    } catch {
      return "project";
    }
  })();
  const dashboardBase = `https://supabase.com/dashboard/project/${projectRef}`;

  const checkMiniAppStatus = useCallback(async () => {
    try {
      setMiniAppStatus({ status: "loading", message: "Checking Mini App..." });

      // HEAD check to miniapp
      const headResponse = await fetch(`${functionsHost}/miniapp`, {
        method: "HEAD",
      });

      // Version endpoint check
      const versionResponse = await fetch(`${functionsHost}/miniapp/version`);
      const versionData = await versionResponse.json();

      if (headResponse.ok && versionResponse.ok) {
        setMiniAppStatus({
          status: "healthy",
          message: "Mini App is accessible",
          details: { version: versionData },
        });
      } else {
        setMiniAppStatus({
          status: "error",
          message:
            `Mini App unreachable (HEAD: ${headResponse.status}, Version: ${versionResponse.status})`,
        });
      }
    } catch (error) {
      setMiniAppStatus({
        status: "error",
        message: `Mini App check failed: ${error}`,
      });
    }
  }, [functionsHost]);

  const checkLinkageAudit = useCallback(async () => {
    try {
      setLinkageAudit({ status: "loading", message: "Checking linkage..." });

      const response = await fetch(`${functionsHost}/linkage-audit`);
      const data = await response.json();

      if (response.ok && data.ok) {
        const audit = data.linkage as LinkageAudit;
        const issues: string[] = [];

        if (!audit.sameHost_webhook_vs_functions) {
          issues.push("Webhook host mismatch");
        }
        if (!audit.sameHost_mini_vs_functions) {
          issues.push("Mini App host mismatch");
        }

        // Check for missing env vars
        const missingEnvs = Object.entries(audit.env)
          .filter(([_, present]) => !present)
          .map(([key]) => key);

        if (missingEnvs.length > 0) {
          issues.push(`Missing env: ${missingEnvs.join(", ")}`);
        }

        if (issues.length === 0) {
          setLinkageAudit({
            status: "healthy",
            message: "All systems linked correctly",
            details: audit,
          });
        } else {
          setLinkageAudit({
            status: "warning",
            message: `Issues found: ${issues.join(", ")}`,
            details: audit,
          });
        }
      } else {
        setLinkageAudit({
          status: "error",
          message: "Linkage audit failed",
        });
      }
    } catch (error) {
      setLinkageAudit({
        status: "error",
        message: `Linkage check failed: ${error}`,
      });
    }
  }, [functionsHost]);

  const checkWebhookStatus = useCallback(async () => {
    try {
      setWebhookStatus({ status: "loading", message: "Checking webhook..." });

      const response = await fetch(`${functionsHost}/telegram-getwebhook`);
      const data = await response.json();

      if (response.ok && data.ok) {
        const webhookInfo = data.webhook_info;
        const hasErrors = webhookInfo.result?.last_error_message;
        const pendingUpdates = webhookInfo.result?.pending_update_count || 0;

        if (hasErrors) {
          setWebhookStatus({
            status: "error",
            message: `Webhook error: ${webhookInfo.result.last_error_message}`,
            details: data,
          });
        } else if (pendingUpdates > 0) {
          setWebhookStatus({
            status: "warning",
            message: `${pendingUpdates} pending updates`,
            details: data,
          });
        } else {
          setWebhookStatus({
            status: "healthy",
            message: "Webhook operating normally",
            details: data,
          });
        }
      } else {
        setWebhookStatus({
          status: "error",
          message: "Webhook check failed",
        });
      }
    } catch (error) {
      setWebhookStatus({
        status: "error",
        message: `Webhook check failed: ${error}`,
      });
    }
  }, [functionsHost]);

  const fixDrift = async () => {
    if (!adminSecret) {
      toast({
        title: "Error",
        description: "Admin secret is required",
        variant: "destructive",
      });
      return;
    }

    setIsFixing(true);

    try {
      const response = await fetch(`${functionsHost}/sync-audit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-secret": adminSecret,
        },
        body: JSON.stringify({
          dry_run: isDryRun,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: isDryRun ? "Drift Analysis Complete" : "Fix Applied",
          description: `${
            isDryRun ? "Checked" : "Fixed"
          } system synchronization`,
        });

        // Refresh all checks after fix
        if (!isDryRun) {
          setTimeout(() => {
            checkMiniAppStatus();
            checkLinkageAudit();
            checkWebhookStatus();
          }, 2000);
        }
      } else {
        toast({
          title: "Fix Failed",
          description: data.error || "Failed to sync system",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Fix Failed",
        description: `Error: ${error}`,
        variant: "destructive",
      });
    } finally {
      setIsFixing(false);
    }
  };

  const getStatusIcon = (status: HealthStatus["status"]) => {
    switch (status) {
      case "healthy":
        return <Icon name="Check" className="h-4 w-4 text-success" />;
      case "warning":
        return <Icon name="Triangle" className="h-4 w-4 text-warning" />;
      case "error":
        return <Icon name="X" className="h-4 w-4 text-destructive" />;
      case "loading":
        return <Icon name="RotateCw" className="h-4 w-4 animate-spin" />;
    }
  };

  const getStatusBadge = (status: HealthStatus["status"]) => {
    const variants = {
      healthy: "default",
      warning: "secondary",
      error: "destructive",
      loading: "outline",
    } as const;

    return (
      <Badge variant={variants[status]} className="capitalize">
        {status}
      </Badge>
    );
  };

  useEffect(() => {
    checkMiniAppStatus();
    checkLinkageAudit();
    checkWebhookStatus();
  }, [checkMiniAppStatus, checkLinkageAudit, checkWebhookStatus]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">System Health</h2>
        <p className="text-muted-foreground">
          Monitor synchronization across the Dynamic Capital stack—from GitHub
          to Supabase and Telegram touchpoints.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Mini App Status */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mini App</CardTitle>
            {getStatusIcon(miniAppStatus.status)}
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-xs text-muted-foreground">
                {miniAppStatus.message}
              </div>
              {getStatusBadge(miniAppStatus.status)}
            </div>
            {miniAppStatus.details && (
              <div className="mt-2 text-xs text-muted-foreground">
                Version: {miniAppStatus.details.version?.ts || "Unknown"}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Linkage Audit */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Linkage</CardTitle>
            {getStatusIcon(linkageAudit.status)}
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-xs text-muted-foreground">
                {linkageAudit.message}
              </div>
              {getStatusBadge(linkageAudit.status)}
            </div>
            {linkageAudit.details && (
              <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                <div>Project: {linkageAudit.details.projectRef}</div>
                <div className="flex items-center gap-1">
                  Webhook:
                  {linkageAudit.details.sameHost_webhook_vs_functions
                    ? <Icon name="Check" className="h-3 w-3 text-success" />
                    : <Icon name="X" className="h-3 w-3 text-destructive" />}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Webhook Status */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Telegram Webhook
            </CardTitle>
            {getStatusIcon(webhookStatus.status)}
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-xs text-muted-foreground">
                {webhookStatus.message}
              </div>
              {getStatusBadge(webhookStatus.status)}
            </div>
            {webhookStatus.details?.webhook_info?.result && (
              <div className="mt-2 text-xs text-muted-foreground">
                Updates: {webhookStatus.details.webhook_info.result
                  .pending_update_count || 0}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Fix Drift Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Icon name="Settings" className="h-5 w-5" />
            Fix System Drift
          </CardTitle>
          <CardDescription>
            Synchronize configurations across all systems. Use dry-run first to
            preview changes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="admin-secret">Admin Secret</Label>
            <Input
              id="admin-secret"
              type="password"
              placeholder="Enter admin secret"
              value={adminSecret}
              onChange={(e) => setAdminSecret(e.target.value)}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="dry-run"
              checked={isDryRun}
              onCheckedChange={setIsDryRun}
            />
            <Label htmlFor="dry-run">
              {isDryRun ? "Dry Run (Preview Only)" : "Apply Changes"}
            </Label>
          </div>

          <Button
            onClick={fixDrift}
            disabled={!adminSecret || isFixing}
            className="w-full"
          >
            {isFixing
              ? (
                <>
                  <Icon name="RotateCw" className="h-4 w-4 animate-spin" />
                  Processing...
                </>
              )
              : (
                isDryRun ? "Check Drift" : "Fix Drift"
              )}
          </Button>
        </CardContent>
      </Card>

      {/* Quick Links */}
      <Alert>
        <Icon name="ExternalLink" className="h-4 w-4" />
        <AlertDescription className="flex flex-wrap gap-4">
          <a
            href={`${dashboardBase}/functions`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            Edge Functions
          </a>
          <a
            href={`${dashboardBase}/functions/telegram-bot/logs`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            Bot Logs
          </a>
          <a
            href={`${dashboardBase}/settings/functions`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            Secrets
          </a>
        </AlertDescription>
      </Alert>
    </div>
  );
};
