import "@testing-library/jest-dom/vitest";

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DynamicCliWorkbench } from "../DynamicCliWorkbench";
import { DEFAULT_DYNAMIC_CLI_SCENARIO } from "@/services/dynamic-cli";

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

    const runButton = screen.getByRole("button", { name: /run dynamic cli/i });
    fireEvent.click(runButton);

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());

    const [, init] = fetchMock.mock.calls[0] as [RequestInfo, RequestInit];
    expect(init?.method).toBe("POST");
    const payload = JSON.parse(init?.body as string) as Record<string, unknown>;
    expect(payload.format).toBe("text");
    expect(payload.exportDataset).toBe(false);
    expect(payload.scenario).toEqual(DEFAULT_DYNAMIC_CLI_SCENARIO);

    const report = await screen.findByLabelText(/dynamic cli report/i);
    expect(report).toHaveTextContent("CLI report");
  });

  it("surfaces errors from the API", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: "Invalid Dynamic CLI payload." }), {
        status: 400,
        headers: { "content-type": "application/json" },
      }),
    );

    render(<DynamicCliWorkbench />);

    fireEvent.click(screen.getByRole("button", { name: /run dynamic cli/i }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/invalid dynamic cli payload/i);
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

    fireEvent.click(screen.getByRole("button", { name: /fine-tune/i }));
    fireEvent.click(screen.getByRole("button", { name: /run dynamic cli/i }));

    await screen.findByLabelText(/dynamic cli dataset/i);

    fireEvent.click(screen.getByRole("button", { name: /download json/i }));
    expect(createObjectUrlMock).toHaveBeenCalledTimes(1);
    expect(revokeObjectUrlMock).toHaveBeenCalledTimes(1);
  });
});
