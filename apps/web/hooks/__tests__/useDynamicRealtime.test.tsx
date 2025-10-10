import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { type ChatMessage, useDynamicRealtime } from "../useDynamicRealtime";

const insertHandlers: Array<(payload: { new: ChatMessage }) => void> = [];
const updateHandlers: Array<(payload: { new: ChatMessage }) => void> = [];
const deleteHandlers: Array<(payload: { old: ChatMessage }) => void> = [];

const removeChannelMock = vi.fn();
const channelMock = {
  on: vi.fn((event: string, filter: { event: string }, callback: unknown) => {
    if (event === "postgres_changes") {
      if (filter.event === "INSERT") {
        insertHandlers.push(
          callback as (payload: { new: ChatMessage }) => void,
        );
      }
      if (filter.event === "UPDATE") {
        updateHandlers.push(
          callback as (payload: { new: ChatMessage }) => void,
        );
      }
      if (filter.event === "DELETE") {
        deleteHandlers.push(
          callback as (payload: { old: ChatMessage }) => void,
        );
      }
    }
    return channelMock;
  }),
  subscribe: vi.fn((statusCallback: (status: string) => void) => {
    statusCallback("SUBSCRIBED");
    return channelMock;
  }),
};

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    channel: vi.fn(() => channelMock),
    removeChannel: removeChannelMock,
  },
}));

describe("useDynamicRealtime", () => {
  beforeEach(() => {
    insertHandlers.length = 0;
    updateHandlers.length = 0;
    deleteHandlers.length = 0;
    removeChannelMock.mockClear();
    channelMock.on.mockClear();
    channelMock.subscribe.mockClear();
  });

  it("captures realtime inserts and exposes state", async () => {
    const onMessage = vi.fn();

    const { result, unmount } = renderHook(() =>
      useDynamicRealtime({ sessionId: "session-1", onMessage })
    );

    const message: ChatMessage = {
      id: "m-1",
      session_id: "session-1",
      role: "assistant",
      content: "Hello",
      created_at: new Date().toISOString(),
      metadata: { model: "test" },
    };

    act(() => {
      insertHandlers.forEach((handler) => handler({ new: message }));
    });

    await waitFor(() => expect(onMessage).toHaveBeenCalledWith(message));
    await waitFor(() => expect(result.current.messages).toHaveLength(1));

    unmount();
    expect(removeChannelMock).toHaveBeenCalled();
  });
});
