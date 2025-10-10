"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

export interface ChatMessage {
  id: string;
  session_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  metadata?: Record<string, unknown> | null;
  created_at: string;
}

interface UseDynamicRealtimeOptions {
  sessionId?: string | null;
  initialMessages?: ChatMessage[];
  onMessage?: (message: ChatMessage) => void;
  onUpdate?: (message: ChatMessage) => void;
  onDelete?: (message: ChatMessage) => void;
  onError?: (error: Error) => void;
}

const CHANNEL_PREFIX = "chat-session-";

export function useDynamicRealtime({
  sessionId,
  initialMessages,
  onMessage,
  onUpdate,
  onDelete,
  onError,
}: UseDynamicRealtimeOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>(
    initialMessages ?? [],
  );
  const [isConnected, setIsConnected] = useState(false);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const messageIds = useRef<Set<string>>(
    new Set(
      (initialMessages ?? []).map((message) => message.id),
    ),
  );

  useEffect(() => {
    if (initialMessages) {
      setMessages(initialMessages);
      messageIds.current = new Set(
        initialMessages.map((message) => message.id),
      );
    } else if (!sessionId) {
      setMessages([]);
      messageIds.current.clear();
    }
  }, [initialMessages, sessionId]);

  const mergeIncomingMessage = useCallback((incoming: ChatMessage) => {
    setMessages((previous) => {
      const existingIndex = previous.findIndex((msg) => msg.id === incoming.id);
      if (existingIndex !== -1) {
        const next = [...previous];
        next[existingIndex] = incoming;
        return next;
      }

      const optimisticIndex = previous.findIndex((msg) =>
        msg.id.startsWith("temp-") &&
        msg.role === incoming.role &&
        msg.content.trim() === incoming.content.trim()
      );

      const next = [...previous];
      if (optimisticIndex !== -1) {
        messageIds.current.delete(previous[optimisticIndex].id);
        next[optimisticIndex] = incoming;
      } else {
        next.push(incoming);
      }

      messageIds.current.add(incoming.id);
      next.sort((a, b) => a.created_at.localeCompare(b.created_at));
      return next;
    });
  }, []);

  useEffect(() => {
    if (!sessionId) {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
        setChannel(null);
      }
      setIsConnected(false);
      return;
    }

    const realtimeChannel = supabase
      .channel(`${CHANNEL_PREFIX}${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          const newMessage = payload.new as ChatMessage;
          mergeIncomingMessage(newMessage);
          onMessage?.(newMessage);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "chat_messages",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          const updatedMessage = payload.new as ChatMessage;
          messageIds.current.add(updatedMessage.id);
          setMessages((previous) =>
            previous.map((msg) =>
              msg.id === updatedMessage.id ? updatedMessage : msg
            )
          );
          onUpdate?.(updatedMessage);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "chat_messages",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          const deletedMessage = payload.old as ChatMessage;
          messageIds.current.delete(deletedMessage.id);
          setMessages((previous) =>
            previous.filter((msg) => msg.id !== deletedMessage.id)
          );
          onDelete?.(deletedMessage);
        },
      )
      .subscribe((status) => {
        setIsConnected(status === "SUBSCRIBED");

        if (status === "CHANNEL_ERROR") {
          onError?.(new Error("Failed to connect to realtime channel"));
        }
      });

    channelRef.current = realtimeChannel;
    setChannel(realtimeChannel);

    return () => {
      supabase.removeChannel(realtimeChannel);
      setIsConnected(false);
      if (channelRef.current === realtimeChannel) {
        channelRef.current = null;
        setChannel(null);
      }
    };
  }, [sessionId, mergeIncomingMessage, onDelete, onError, onMessage, onUpdate]);

  const disconnect = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
      setChannel(null);
      setIsConnected(false);
    }
  }, []);

  const reset = useCallback(() => {
    messageIds.current.clear();
    setMessages([]);
  }, []);

  const state = useMemo(() => ({
    messages,
    isConnected,
    channel,
  }), [messages, isConnected, channel]);

  return {
    ...state,
    disconnect,
    reset,
  };
}
