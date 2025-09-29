import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ChatAssistantWidget } from "../ChatAssistantWidget";
import { DynamicChatError } from "@/hooks/useDynamicChat";

type FetchHistoryResult = {
  messages: Array<{ role: "user" | "assistant"; content: string }>;
};
type SendMessageResult = {
  assistantMessage: { role: "assistant"; content: string } | null;
  history: Array<{ role: "user" | "assistant"; content: string }>;
  metadata?: Record<string, unknown>;
};

const fetchHistoryMock = vi.fn<() => Promise<FetchHistoryResult>>();
const sendMessageMock = vi.fn<
  (
    args: {
      message: string;
      history: Array<{ role: "user" | "assistant"; content: string }>;
    },
  ) => Promise<SendMessageResult>
>();

vi.mock("@/hooks/useDynamicChat", async () => {
  const actual = await vi.importActual<
    typeof import("@/hooks/useDynamicChat")
  >("@/hooks/useDynamicChat");
  return {
    ...actual,
    useDynamicChat: () => ({
      fetchHistory: fetchHistoryMock,
      sendMessage: sendMessageMock,
    }),
  };
});

const trackWithTelegramContextMock = vi.fn();

vi.mock("@/hooks/useAnalytics", () => ({
  useAnalytics: () => ({
    trackWithTelegramContext: trackWithTelegramContextMock,
  }),
}));

vi.mock("@/components/dynamic-ui-system", () => {
  const { createElement, forwardRef } = React;

  const allowedEvents = new Set([
    "onClick",
    "onMouseEnter",
    "onMouseLeave",
    "onFocus",
    "onBlur",
    "onKeyDown",
    "onKeyUp",
    "onSubmit",
    "onChange",
  ]);

  const sanitizeProps = (props: Record<string, unknown>) => {
    const allowed = new Set([
      "className",
      "id",
      "role",
      "style",
      "tabIndex",
      "title",
      "type",
      "disabled",
      "value",
      "placeholder",
      "htmlFor",
      "name",
      "href",
      "target",
      "rel",
    ]);

    return Object.fromEntries(
      Object.entries(props).filter(([key]) => {
        if (allowed.has(key)) {
          return true;
        }
        if (key.startsWith("data-")) {
          return true;
        }
        if (key.startsWith("aria-")) {
          return true;
        }
        if (allowedEvents.has(key)) {
          return true;
        }
        return false;
      }),
    );
  };

  return {
    Button: forwardRef<HTMLButtonElement, React.ComponentPropsWithoutRef<"button">>(
      ({ children, ...props }, ref) =>
        createElement("button", { ref, ...sanitizeProps(props) }, children),
    ),
    Input: forwardRef<HTMLInputElement, React.ComponentPropsWithoutRef<"input">>(
      ({ ...props }, ref) => createElement("input", { ref, ...sanitizeProps(props) }),
    ),
    Column: ({ children, ...props }: React.ComponentPropsWithoutRef<"div">) =>
      createElement("div", { ...sanitizeProps(props) }, children),
    Row: ({ children, ...props }: React.ComponentPropsWithoutRef<"div">) =>
      createElement("div", { ...sanitizeProps(props) }, children),
    Flex: ({ children, ...props }: React.ComponentPropsWithoutRef<"div">) =>
      createElement("div", { ...sanitizeProps(props) }, children),
    Badge: ({ children, ...props }: React.ComponentPropsWithoutRef<"span">) =>
      createElement("span", { ...sanitizeProps(props) }, children),
    Spinner: () => createElement("div", { role: "status" }, "loading"),
    Text: ({ children, as, ...props }: any) =>
      createElement(as ?? "span", { ...sanitizeProps(props) }, children),
  };
});

vi.mock("@/components/dynamic-ui", () => {
  const { createElement } = React;

  const allowedEvents = new Set([
    "onClick",
    "onMouseEnter",
    "onMouseLeave",
    "onFocus",
    "onBlur",
    "onKeyDown",
    "onKeyUp",
    "onSubmit",
    "onChange",
  ]);

  const sanitizeProps = (props: Record<string, unknown>) => {
    const allowed = new Set([
      "className",
      "id",
      "role",
      "style",
      "tabIndex",
      "title",
    ]);

    return Object.fromEntries(
      Object.entries(props).filter(([key]) => {
        if (allowed.has(key)) {
          return true;
        }
        if (key.startsWith("data-")) {
          return true;
        }
        if (key.startsWith("aria-")) {
          return true;
        }
        if (allowedEvents.has(key)) {
          return true;
        }
        return false;
      }),
    );
  };

  return {
    DynamicContainer: ({ children, ...props }: any) =>
      createElement("div", { ...sanitizeProps(props) }, children),
    DynamicMotionStackItem: ({ children, ...props }: any) =>
      createElement("div", { ...sanitizeProps(props) }, children),
  };
});

describe("ChatAssistantWidget", () => {
  const renderWidget = () => render(<ChatAssistantWidget />);
  const ensureWidgetOpen = async () => {
    const openButtons = screen.queryAllByLabelText(
      /open dynamic capital assistant/i,
    );
    if (openButtons.length > 0) {
      fireEvent.click(openButtons[0]);
    }

    await screen.findAllByRole("textbox");
  };

  const findQuestionInput = async () => {
    const inputs = await screen.findAllByRole("textbox");
    expect(inputs.length).toBeGreaterThan(0);
    return inputs[0];
  };

  beforeEach(() => {
    fetchHistoryMock.mockReset();
    sendMessageMock.mockReset();
    fetchHistoryMock.mockResolvedValue({ messages: [] });
    sendMessageMock.mockResolvedValue({ assistantMessage: null, history: [] });
    localStorage.clear();
    sessionStorage.clear();
    trackWithTelegramContextMock.mockClear();
  });

  it("renders history returned by the dynamic chat hook", async () => {
    const history: FetchHistoryResult["messages"] = [
      { role: "assistant", content: "Welcome to Dynamic Capital" },
      { role: "user", content: "Thanks" },
    ];

    fetchHistoryMock.mockResolvedValueOnce({ messages: history });

    renderWidget();

    await waitFor(() => {
      expect(fetchHistoryMock).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      const stored = localStorage.getItem("chat-assistant-history");
      expect(stored).not.toBeNull();
      expect(JSON.parse(stored ?? "[]")).toEqual(history);
    });
  });

  it("sends a message and displays the assistant response", async () => {
    sendMessageMock.mockResolvedValueOnce({
      assistantMessage: { role: "assistant", content: "Hello trader" },
      history: [
        { role: "user", content: "Hi" },
        { role: "assistant", content: "Hello trader" },
      ],
    });

    renderWidget();

    await ensureWidgetOpen();

    const input = await findQuestionInput();
    fireEvent.change(input, { target: { value: "Hi" } });

    const sendButton = (await screen.findAllByRole("button", { name: /send/i }))
      .at(0);
    expect(sendButton).toBeDefined();
    if (!sendButton) {
      throw new Error("Send button not found");
    }
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(sendMessageMock).toHaveBeenCalledTimes(1);
    });

    expect(await screen.findByText("Hello trader")).toBeInTheDocument();
  });

  it("fills the input when selecting a quick suggestion", async () => {
    renderWidget();

    await ensureWidgetOpen();

    const suggestionButton = (await screen.findAllByRole("button", {
      name: /what does the dynamic capital desk include/i,
    })).at(0);
    expect(suggestionButton).toBeDefined();
    if (!suggestionButton) {
      throw new Error("Suggestion button not found");
    }
    fireEvent.click(suggestionButton);

    const input = await findQuestionInput();
    expect(input).toHaveValue("What does the Dynamic Capital desk include?");
  });

  it("shows the fallback playbook and retry control when history load fails", async () => {
    fetchHistoryMock.mockRejectedValueOnce(
      new DynamicChatError("server down", { status: 500, requestId: "abc" }),
    );

    renderWidget();

    expect(
      await screen.findByText(/lost the connection for a moment/i),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("button", { name: /retry/i }),
    ).toBeInTheDocument();
  });

  it("surfaces inline guidance for recoverable send errors", async () => {
    sendMessageMock.mockRejectedValueOnce(
      new DynamicChatError("Rate limit", { status: 429 }),
    );

    renderWidget();

    await ensureWidgetOpen();

    const input = await findQuestionInput();
    fireEvent.change(input, { target: { value: "Test question" } });

    const sendButton = (await screen.findAllByRole("button", { name: /send/i }))
      .at(0);
    expect(sendButton).toBeDefined();
    if (!sendButton) {
      throw new Error("Send button not found");
    }
    fireEvent.click(sendButton);

    expect(
      await screen.findByText(/temporary rate limit/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/lost the connection for a moment/i),
    ).not.toBeInTheDocument();
    expect(input).toHaveValue("Test question");
  });
});
