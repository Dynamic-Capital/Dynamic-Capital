"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ChangeEvent, KeyboardEvent } from "react";
import { Download, Play, RotateCcw, X } from "lucide-react";

import {
  Column,
  Heading,
  Row,
  Tag,
  Text,
} from "@/components/dynamic-ui-system";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  DEFAULT_DYNAMIC_CLI_SCENARIO,
  type DynamicCliReportFormat,
  type DynamicCliRequestOptions,
  type DynamicCliResponsePayload,
  type DynamicCliScenario,
  type DynamicCliScenarioDiagnostics,
  runDynamicCli,
  validateDynamicCliScenario,
} from "@/services/dynamic-cli";
import { useTelegramAuth } from "@/hooks/useTelegramAuth";

const FORMAT_OPTIONS: Array<{
  value: DynamicCliReportFormat;
  label: string;
  description: string;
}> = [
  {
    value: "text",
    label: "Text report",
    description: "Human-readable narrative with alerts and focus areas.",
  },
  {
    value: "json",
    label: "JSON",
    description: "Structured payload for dashboards or automation pipelines.",
  },
  {
    value: "fine-tune",
    label: "Fine-tune dataset",
    description: "Dynamic AGI training dataset (includes report metadata).",
  },
];

function toPrettyJson(content: string): string {
  try {
    const parsed = JSON.parse(content);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return content;
  }
}

function buildDefaultScenarioText(): string {
  return JSON.stringify(DEFAULT_DYNAMIC_CLI_SCENARIO, null, 2);
}

export function DynamicCliWorkbench() {
  const { loading: adminLoading, getAdminAuth } = useTelegramAuth();
  const adminAuth = useMemo(() => getAdminAuth?.() ?? null, [getAdminAuth]);
  const hasAdminToken = Boolean(adminAuth?.token);

  const [scenarioText, setScenarioText] = useState(() =>
    buildDefaultScenarioText()
  );
  const [format, setFormat] = useState<DynamicCliReportFormat>("text");
  const [indent, setIndent] = useState(2);
  const [fineTuneTags, setFineTuneTags] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState("");
  const [exportDataset, setExportDataset] = useState(false);
  const [result, setResult] = useState<DynamicCliResponsePayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const scenarioDiagnostics: DynamicCliScenarioDiagnostics = useMemo(() => {
    try {
      const parsed = JSON.parse(scenarioText);
      return validateDynamicCliScenario(parsed);
    } catch {
      return {
        valid: false,
        errors: ["Scenario JSON must be valid."],
        warnings: [],
        summary: {
          nodeCount: 0,
          pulseCount: 0,
          mostRecentPulse: null,
        },
      };
    }
  }, [scenarioText]);

  useEffect(() => {
    if (format === "fine-tune") {
      setExportDataset(true);
    }
  }, [format]);

  const resolvedDatasetPreference = format === "fine-tune"
    ? true
    : exportDataset;

  const formattedReport = useMemo(() => {
    if (!result) {
      return "";
    }
    if (result.reportFormat === "text") {
      return result.report.trim();
    }
    return toPrettyJson(result.report);
  }, [result]);

  const datasetPreview = useMemo(() => {
    if (!result?.dataset) return "";
    return JSON.stringify(result.dataset, null, 2);
  }, [result]);

  const handleReset = useCallback(() => {
    setScenarioText(buildDefaultScenarioText());
    setFineTuneTags([]);
    setTagDraft("");
    setExportDataset(false);
    setResult(null);
    setError(null);
    setFormat("text");
    setIndent(2);
  }, []);

  const handleSubmit = useCallback(async () => {
    setError(null);

    if (!scenarioDiagnostics.valid || !scenarioDiagnostics.scenario) {
      setError(
        scenarioDiagnostics.errors[0] ?? "Scenario JSON must be valid.",
      );
      return;
    }

    const typedScenario = scenarioDiagnostics.scenario as DynamicCliScenario;

    setIsSubmitting(true);
    try {
      const auth = getAdminAuth?.();
      if (!auth?.token) {
        setError(
          "Admin session expired. Refresh your admin token and try again.",
        );
        return;
      }
      const requestOptions: DynamicCliRequestOptions = {
        adminToken: auth.token,
        adminInitData: auth.initData,
      };
      const response = await runDynamicCli({
        scenario: typedScenario,
        format,
        indent,
        fineTuneTags,
        exportDataset: resolvedDatasetPreference,
      }, requestOptions);
      setResult(response);
    } catch (cliError) {
      const message = cliError instanceof Error
        ? cliError.message
        : "Dynamic CLI request failed.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }, [
    format,
    indent,
    resolvedDatasetPreference,
    fineTuneTags,
    scenarioDiagnostics,
    getAdminAuth,
  ]);

  const handleIndentChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const parsed = Number(event.target.value);
      if (Number.isNaN(parsed)) {
        setIndent(0);
        return;
      }
      const clamped = Math.max(-1, Math.min(8, Math.round(parsed)));
      setIndent(clamped);
    },
    [],
  );

  const handleTagKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key !== "Enter" && event.key !== ",") {
        return;
      }
      event.preventDefault();
      const trimmed = tagDraft.trim();
      if (!trimmed) {
        return;
      }
      if (fineTuneTags.includes(trimmed) || fineTuneTags.length >= 16) {
        setTagDraft("");
        return;
      }
      setFineTuneTags((previous) => [...previous, trimmed]);
      setTagDraft("");
    },
    [fineTuneTags, tagDraft],
  );

  const handleRemoveTag = useCallback((tag: string) => {
    setFineTuneTags((previous) => previous.filter((value) => value !== tag));
  }, []);

  const handleDownloadDataset = useCallback(() => {
    if (!result?.dataset) {
      return;
    }
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const blob = new Blob([
      `${JSON.stringify(result.dataset, null, 2)}\n`,
    ], { type: "application/json" });
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = `dynamic-cli-dataset-${timestamp}.json`;
    anchor.click();
    URL.revokeObjectURL(objectUrl);
  }, [result]);

  if (adminLoading) {
    return (
      <Column gap="24" align="center" horizontal="center" paddingY="40">
        <Heading variant="heading-strong-m">Checking admin access…</Heading>
        <Text
          variant="body-default-m"
          onBackground="neutral-weak"
          align="center"
        >
          Hold tight while we confirm your admin session.
        </Text>
      </Column>
    );
  }

  if (!hasAdminToken) {
    return (
      <Column gap="24" align="center" horizontal="center" paddingY="40">
        <Heading variant="heading-strong-m">Admin session required</Heading>
        <Text
          variant="body-default-m"
          onBackground="neutral-weak"
          align="center"
        >
          Refresh the admin control room to generate a valid session token
          before running the Dynamic CLI/CD workbench.
        </Text>
        <Tag size="s" background="brand-alpha-weak">
          Tip: Authenticate via the admin gate to mint a new token.
        </Tag>
      </Column>
    );
  }

  return (
    <Column gap="32" fillWidth>
      <Row gap="24" wrap align="start" fillWidth>
        <Column
          flex={1}
          minWidth={28}
          gap="20"
          padding="24"
          radius="l"
          background="surface"
          border="neutral-alpha-medium"
          className="shadow-lg shadow-primary/5"
        >
          <Column gap="8">
            <Heading variant="display-strong-xs">
              Compose a Dynamic CLI/CD scenario
            </Heading>
            <Text onBackground="neutral-weak" variant="body-default-m">
              Paste or adapt the scenario JSON, choose an output format, and
              stream the Dynamic CLI engine directly from the workspace.
            </Text>
          </Column>

          <Column gap="12">
            <Label htmlFor="dynamic-cli-scenario">Scenario JSON</Label>
            <Textarea
              id="dynamic-cli-scenario"
              value={scenarioText}
              onChange={(event) => setScenarioText(event.target.value)}
              rows={18}
              className="font-mono text-sm"
              aria-describedby="dynamic-cli-scenario-helper"
            />
            <Text
              id="dynamic-cli-scenario-helper"
              variant="body-default-xs"
              onBackground="neutral-medium"
            >
              The schema matches the CLI manual: history, decay, nodes, and
              pulses. Use the default blueprint as a starting point.
            </Text>
            <Column gap="8" aria-live="polite">
              <Text
                as="span"
                variant="label-default-xs"
                className="uppercase tracking-wide"
              >
                Scenario diagnostics
              </Text>
              <Row gap="8" wrap data-testid="dynamic-cli-scenario-summary">
                <Tag size="s" background="neutral-alpha-weak">
                  Nodes: {scenarioDiagnostics.summary.nodeCount}
                </Tag>
                <Tag size="s" background="neutral-alpha-weak">
                  Pulses: {scenarioDiagnostics.summary.pulseCount}
                </Tag>
                {scenarioDiagnostics.summary.mostRecentPulse
                  ? (
                    <Tag size="s" background="neutral-alpha-weak">
                      Latest pulse:{" "}
                      {scenarioDiagnostics.summary.mostRecentPulse}
                    </Tag>
                  )
                  : null}
              </Row>
              {scenarioDiagnostics.warnings.length > 0 && (
                <Column gap="4" data-testid="dynamic-cli-scenario-warnings">
                  {scenarioDiagnostics.warnings.map((warning) => (
                    <Text
                      key={warning}
                      variant="body-default-xs"
                      className="text-warning"
                    >
                      Warning: {warning}
                    </Text>
                  ))}
                </Column>
              )}
              {scenarioDiagnostics.errors.length > 0 && (
                <Column gap="4" data-testid="dynamic-cli-scenario-errors">
                  {scenarioDiagnostics.errors.map((diagnosticError) => (
                    <Text
                      key={diagnosticError}
                      variant="body-default-xs"
                      onBackground="danger-strong"
                    >
                      {diagnosticError}
                    </Text>
                  ))}
                </Column>
              )}
            </Column>
          </Column>

          <Column gap="16">
            <Column gap="8">
              <Text
                variant="label-default-s"
                className="uppercase tracking-wide"
              >
                Report format
              </Text>
              <Row gap="8" wrap>
                {FORMAT_OPTIONS.map((option) => {
                  const isActive = format === option.value;
                  return (
                    <Column key={option.value} gap="8">
                      <Button
                        type="button"
                        variant={isActive ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setFormat(option.value)}
                        aria-pressed={isActive}
                      >
                        {option.value === "text"
                          ? "Text"
                          : option.value === "json"
                          ? "JSON"
                          : "Fine-tune"}
                      </Button>
                      <Text
                        as="p"
                        variant="body-default-xs"
                        onBackground="neutral-weak"
                        className="max-w-[220px]"
                      >
                        {option.description}
                      </Text>
                    </Column>
                  );
                })}
              </Row>
            </Column>

            <Row gap="16" wrap>
              <Column minWidth={16} gap="8">
                <Label htmlFor="dynamic-cli-indent">Indentation</Label>
                <Input
                  id="dynamic-cli-indent"
                  type="number"
                  min={-1}
                  max={8}
                  value={indent}
                  onChange={handleIndentChange}
                />
                <Text variant="body-default-xs" onBackground="neutral-medium">
                  Applies to JSON and fine-tune outputs. Use -1 for compact
                  JSON.
                </Text>
              </Column>

              <Column minWidth={24} gap="8">
                <Label htmlFor="dynamic-cli-tags">Fine-tune tags</Label>
                <Input
                  id="dynamic-cli-tags"
                  value={tagDraft}
                  onChange={(event) => setTagDraft(event.target.value)}
                  onKeyDown={handleTagKeyDown}
                  placeholder="Press Enter to add tag"
                />
                <Row gap="8" wrap>
                  {fineTuneTags.map((tag) => (
                    <span key={tag} className="inline-flex items-center gap-2">
                      <Tag size="s" background="brand-alpha-weak">{tag}</Tag>
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        aria-label={`Remove tag ${tag}`}
                        onClick={() =>
                          handleRemoveTag(tag)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </span>
                  ))}
                </Row>
              </Column>
            </Row>

            <Row gap="12" vertical="center">
              <Switch
                checked={resolvedDatasetPreference}
                onCheckedChange={setExportDataset}
                disabled={format === "fine-tune"}
                aria-label="Return fine-tune dataset"
              />
              <Text variant="body-default-s" onBackground="neutral-medium">
                Include the fine-tune dataset payload in the response.
              </Text>
            </Row>
          </Column>

          {error && (
            <Text
              role="alert"
              variant="body-default-s"
              onBackground="danger-strong"
            >
              {error}
            </Text>
          )}

          <Row gap="12" wrap>
            <Button
              type="button"
              onClick={handleSubmit}
              isLoading={isSubmitting}
            >
              <Play className="mr-2 h-4 w-4" />
              Run Dynamic CLI
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={handleReset}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset to default scenario
            </Button>
          </Row>
        </Column>

        <Column
          flex={1}
          minWidth={24}
          gap="16"
          padding="24"
          radius="l"
          background="surface"
          border="neutral-alpha-medium"
          className="shadow-lg shadow-primary/5"
        >
          <Heading variant="display-strong-xs">Dynamic CLI output</Heading>
          {result
            ? (
              <Column gap="16">
                <Column gap="8">
                  <Text
                    variant="label-default-s"
                    className="uppercase tracking-wide"
                  >
                    Report
                  </Text>
                  <pre
                    aria-label="Dynamic CLI report"
                    className="max-h-[420px] overflow-auto rounded-md border border-border/60 bg-background/60 p-4 font-mono text-sm"
                  >
                  {formattedReport}
                  </pre>
                </Column>

                <Column gap="8">
                  <Row gap="12" vertical="center">
                    <Text
                      variant="label-default-s"
                      className="uppercase tracking-wide"
                    >
                      Fine-tune dataset
                    </Text>
                    {result.dataset
                      ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={handleDownloadDataset}
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Download JSON
                        </Button>
                      )
                      : null}
                  </Row>
                  {result.dataset
                    ? (
                      <pre
                        aria-label="Dynamic CLI dataset"
                        className="max-h-[320px] overflow-auto rounded-md border border-border/60 bg-background/60 p-4 font-mono text-sm"
                      >
                    {datasetPreview}
                      </pre>
                    )
                    : (
                      <Text
                        variant="body-default-s"
                        onBackground="neutral-medium"
                      >
                        Enable dataset export to preview the Dynamic AGI
                        fine-tune payload.
                      </Text>
                    )}
                </Column>
              </Column>
            )
            : (
              <Column gap="12">
                <Text variant="body-default-m" onBackground="neutral-medium">
                  Submit a scenario to render the latest report and optional
                  dataset.
                </Text>
                <Tag size="s" background="neutral-alpha-weak">
                  Tip: Fine-tune format automatically includes the dataset
                  payload.
                </Tag>
              </Column>
            )}
        </Column>
      </Row>
    </Column>
  );
}

export default DynamicCliWorkbench;
