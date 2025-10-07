import "@testing-library/jest-dom/vitest";

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DynamicCliWorkbench } from "../DynamicCliWorkbench";
import { DEFAULT_DYNAMIC_CLI_SCENARIO } from "@/services/dynamic-cli";

const getAdminAuthMock = vi.fn<
  () => { initData?: string; token?: string } | null
>(
  () => ({ token: "test-admin-token" }),
);

vi.mock("@/hooks/useTelegramAuth", () => ({
  useTelegramAuth: () => ({
    telegramUser: null,
    isAdmin: true,
    isVip: true,
    loading: false,
    initData: null,
    verifyTelegramAuth: vi.fn(),
    checkAdminStatus: vi.fn(),
    getAdminAuth: getAdminAuthMock,
  }),
}));

const originalFetch = globalThis.fetch;
const originalCreateObjectURL = globalThis.URL.createObjectURL;
const originalRevokeObjectURL = globalThis.URL.revokeObjectURL;

const fetchMock = vi.fn();
const createObjectUrlMock = vi.fn(() => "blob:dynamic-cli");
const revokeObjectUrlMock = vi.fn();

vi.mock("@/components/dynamic-ui-system", () => {
  const { createElement } = React;
  const wrap =
    (tag: keyof HTMLElementTagNameMap) => ({ children, ...props }: any) =>
      createElement(tag, props, children as React.ReactNode);

  return {
    Column: wrap("div"),
    Row: wrap("div"),
    Heading: wrap("h2"),
    Text: ({ as = "p", children, ...props }: any) =>
      createElement(as, props, children),
    Tag: wrap("span"),
  };
});

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, isLoading, disabled, ...props }: any) => (
    <button
      type="button"
      disabled={disabled || Boolean(isLoading)}
      {...props}
    >
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/input", () => ({
  Input: ({ children, ...props }: any) => <input {...props}>{children}</input>,
}));

vi.mock("@/components/ui/textarea", () => ({
  Textarea: ({ children, ...props }: any) => (
    <textarea {...props}>{children}</textarea>
  ),
}));

vi.mock("@/components/ui/switch", () => ({
  Switch: ({ checked, onCheckedChange, disabled, ...props }: any) => (
    <label>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onCheckedChange?.(event.target.checked)}
        {...props}
      />
    </label>
  ),
}));

vi.mock("@/components/ui/label", () => ({
  Label: ({ children, ...props }: any) => <label {...props}>{children}</label>,
}));

describe("DynamicCliWorkbench", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    createObjectUrlMock.mockReset();
    revokeObjectUrlMock.mockReset();
    getAdminAuthMock.mockReset();
    getAdminAuthMock.mockReturnValue({ token: "test-admin-token" });
    globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;
    globalThis.URL.createObjectURL = createObjectUrlMock;
    globalThis.URL.revokeObjectURL = revokeObjectUrlMock;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    globalThis.URL.createObjectURL = originalCreateObjectURL;
    globalThis.URL.revokeObjectURL = originalRevokeObjectURL;
  });

  it("submits the default scenario and renders the CLI report", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          report: "CLI report",
          reportFormat: "text",
          dataset: { dataset: true },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );

    render(<DynamicCliWorkbench />);

    const [runButton] = screen.getAllByRole("button", {
      name: /run dynamic cli/i,
    });
    fireEvent.click(runButton);

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());

    const [, init] = fetchMock.mock.calls[0] as [RequestInfo, RequestInit];
    expect(init?.method).toBe("POST");
    const payload = JSON.parse(init?.body as string) as Record<string, unknown>;
    expect(payload.format).toBe("text");
    expect(payload.exportDataset).toBe(false);
    expect(payload.scenario).toEqual(DEFAULT_DYNAMIC_CLI_SCENARIO);
    expect((init?.headers as Record<string, string>).Authorization).toBe(
      "Bearer test-admin-token",
    );

    const report = await screen.findByLabelText(/dynamic cli report/i);
    expect(report).toHaveTextContent("CLI report");
  });

  it("displays diagnostics for the default scenario", () => {
    render(<DynamicCliWorkbench />);

    const diagnosticsSummary = screen.getByTestId(
      "dynamic-cli-scenario-summary",
    );
    expect(diagnosticsSummary).toHaveTextContent(/nodes: 3/i);
    expect(diagnosticsSummary).toHaveTextContent(/pulses: 6/i);
    expect(diagnosticsSummary).toHaveTextContent(
      /latest pulse: 2024-04-01t09:00:00.000z/i,
    );
  });

  it("surfaces errors from the API", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: "Invalid Dynamic CLI payload." }), {
        status: 400,
        headers: { "content-type": "application/json" },
      }),
    );

    render(<DynamicCliWorkbench />);

    const [errorRunButton] = screen.getAllByRole("button", {
      name: /run dynamic cli/i,
    });
    fireEvent.click(errorRunButton);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/invalid dynamic cli payload/i);
  });

  it("blocks access when admin token is unavailable", () => {
    getAdminAuthMock.mockReturnValue(null);

    render(<DynamicCliWorkbench />);

    expect(
      screen.getByRole("heading", { name: /admin session required/i }),
    ).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("validates the scenario JSON before submitting", async () => {
    render(<DynamicCliWorkbench />);

    const scenarioInput = screen.getByLabelText(/scenario json/i);
    fireEvent.change(scenarioInput, { target: { value: "{ invalid" } });

    const [runButton] = screen.getAllByRole("button", {
      name: /run dynamic cli/i,
    });
    fireEvent.click(runButton);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/scenario json must be valid/i);
    expect(fetchMock).not.toHaveBeenCalled();

    expect(
      screen.getByTestId("dynamic-cli-scenario-errors"),
    ).toHaveTextContent(/scenario json must be valid/i);
  });

  it("highlights scenario warnings for out-of-range maturity", () => {
    render(<DynamicCliWorkbench />);

    const scenarioInput = screen.getByLabelText(/scenario json/i);
    const warningScenario = {
      history: 12,
      decay: 0.1,
      nodes: [
        { key: "alpha", title: "Alpha" },
      ],
      pulses: [
        {
          node: "alpha",
          maturity: 1.2,
          timestamp: "2024-01-01T00:00:00Z",
        },
      ],
    };

    fireEvent.change(scenarioInput, {
      target: { value: JSON.stringify(warningScenario, null, 2) },
    });

    expect(
      screen.getByTestId("dynamic-cli-scenario-warnings"),
    ).toHaveTextContent(/maturity should be between 0 and 1/i);
  });

  it("downloads the dataset when the fine-tune format is selected", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          report: JSON.stringify({ message: "ok" }),
          reportFormat: "fine-tune",
          dataset: { examples: [{ id: "node" }] },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );

    render(<DynamicCliWorkbench />);

    const [fineTuneButton] = screen.getAllByRole("button", {
      name: /fine-tune/i,
    });
    fireEvent.click(fineTuneButton);
    const [datasetRunButton] = screen.getAllByRole("button", {
      name: /run dynamic cli/i,
    });
    fireEvent.click(datasetRunButton);

    await screen.findByLabelText(/dynamic cli dataset/i);

    fireEvent.click(screen.getByRole("button", { name: /download json/i }));
    expect(createObjectUrlMock).toHaveBeenCalledTimes(1);
    expect(revokeObjectUrlMock).toHaveBeenCalledTimes(1);
  });
});
