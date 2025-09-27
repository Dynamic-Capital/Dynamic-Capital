import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ChatAssistantWidget } from "../ChatAssistantWidget";

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

vi.mock("@/hooks/useDynamicChat", () => ({
  useDynamicChat: () => ({
    fetchHistory: fetchHistoryMock,
    sendMessage: sendMessageMock,
  }),
}));

describe("ChatAssistantWidget", () => {
  beforeEach(() => {
    fetchHistoryMock.mockReset();
    sendMessageMock.mockReset();
    fetchHistoryMock.mockResolvedValue({ messages: [] });
    sendMessageMock.mockResolvedValue({ assistantMessage: null, history: [] });
    localStorage.clear();
  });

  it("renders history returned by the dynamic chat hook", async () => {
    const history: FetchHistoryResult["messages"] = [
      { role: "assistant", content: "Welcome to Dynamic Capital" },
      { role: "user", content: "Thanks" },
    ];

    fetchHistoryMock.mockResolvedValueOnce({ messages: history });

    render(<ChatAssistantWidget />);

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

    render(<ChatAssistantWidget />);

    const user = userEvent.setup();
    const openButton = await screen.findByLabelText(
      /open dynamic capital assistant/i,
    );
    await user.click(openButton);

    const input = await screen.findByPlaceholderText(
      /ask about vip plans/i,
    );
    fireEvent.change(input, { target: { value: "Hi" } });

    const sendButton = await screen.findByRole("button", { name: /send/i });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(sendMessageMock).toHaveBeenCalledTimes(1);
    });

    expect(await screen.findByText("Hello trader")).toBeInTheDocument();
  });

  it("fills the input when selecting a quick suggestion", async () => {
    render(<ChatAssistantWidget />);

    const user = userEvent.setup();
    const openButton = await screen.findByLabelText(
      /open dynamic capital assistant/i,
    );
    await user.click(openButton);

    const suggestionButton = await screen.findByRole("button", {
      name: /what does the dynamic capital desk include/i,
    });
    fireEvent.click(suggestionButton);

    const input = await screen.findByPlaceholderText(
      /ask about vip plans/i,
    );
    expect(input).toHaveValue("What does the Dynamic Capital desk include?");
  });
});
