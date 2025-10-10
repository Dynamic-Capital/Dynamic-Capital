"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

export interface UserPresence {
  user_id: string;
  username?: string;
  status: "online" | "idle" | "offline";
  online_at: string;
  metadata?: Record<string, unknown>;
}

type PresenceState = Record<string, UserPresence[]>;

interface UseDynamicPresenceOptions {
  roomId?: string | null;
  userId?: string | null;
  username?: string;
  metadata?: Record<string, unknown>;
  onJoin?: (user: UserPresence) => void;
  onLeave?: (user: UserPresence) => void;
}

export function useDynamicPresence({
  roomId,
  userId,
  username,
  metadata = {},
  onJoin,
  onLeave,
}: UseDynamicPresenceOptions) {
  const [presenceState, setPresenceState] = useState<PresenceState>({});
  const [onlineUsers, setOnlineUsers] = useState<UserPresence[]>([]);
  const [isTracking, setIsTracking] = useState(false);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!roomId || !userId) {
      return () => {};
    }

    const presenceChannel = supabase.channel(`presence-${roomId}`);

    presenceChannel
      .on("presence", { event: "sync" }, () => {
        const state = presenceChannel.presenceState<UserPresence>();
        setPresenceState(state);
        const users = Object.values(state).flat();
        setOnlineUsers(users);
      })
      .on("presence", { event: "join" }, ({ newPresences }) => {
        newPresences.forEach((presence) =>
          onJoin?.(presence as unknown as UserPresence)
        );
      })
      .on("presence", { event: "leave" }, ({ leftPresences }) => {
        leftPresences.forEach((presence) =>
          onLeave?.(presence as unknown as UserPresence)
        );
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          const userStatus: UserPresence = {
            user_id: userId,
            username,
            status: "online",
            online_at: new Date().toISOString(),
            metadata,
          };

          const trackStatus = await presenceChannel.track(userStatus);
          setIsTracking(trackStatus === "ok");
        }
      });

    setChannel(presenceChannel);

    heartbeatRef.current = setInterval(async () => {
      await presenceChannel.track({
        user_id: userId,
        username,
        status: "online",
        online_at: new Date().toISOString(),
        metadata,
      });
    }, 30_000);

    return () => {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
      supabase.removeChannel(presenceChannel);
      setIsTracking(false);
      setChannel(null);
      setPresenceState({});
      setOnlineUsers([]);
    };
  }, [roomId, userId, username, metadata, onJoin, onLeave]);

  const updatePresence = useCallback(async (
    updates: Partial<UserPresence>,
  ) => {
    if (!channel || !isTracking || !userId) return;

    const userStatus: UserPresence = {
      user_id: userId,
      username,
      status: "online",
      online_at: new Date().toISOString(),
      metadata,
      ...updates,
    };

    await channel.track(userStatus);
  }, [channel, isTracking, metadata, userId, username]);

  const setStatus = useCallback((status: "online" | "idle" | "offline") => {
    void updatePresence({ status });
  }, [updatePresence]);

  const value = useMemo(() => ({
    presenceState,
    onlineUsers,
    isTracking,
    channel,
  }), [presenceState, onlineUsers, isTracking, channel]);

  return {
    ...value,
    updatePresence,
    setStatus,
  };
}
