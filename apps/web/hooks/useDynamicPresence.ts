import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface UserPresence {
  user_id: string;
  username?: string;
  status: 'online' | 'idle' | 'offline';
  online_at: string;
  metadata?: Record<string, any>;
}

interface PresenceState {
  [key: string]: UserPresence[];
}

interface UseDynamicPresenceOptions {
  roomId: string;
  userId: string;
  username?: string;
  metadata?: Record<string, any>;
  onJoin?: (user: UserPresence) => void;
  onLeave?: (user: UserPresence) => void;
}

export function useDynamicPresence({
  roomId,
  userId,
  username,
  metadata = {},
  onJoin,
  onLeave
}: UseDynamicPresenceOptions) {
  const [presenceState, setPresenceState] = useState<PresenceState>({});
  const [onlineUsers, setOnlineUsers] = useState<UserPresence[]>([]);
  const [isTracking, setIsTracking] = useState(false);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!roomId || !userId) return;

    const presenceChannel = supabase.channel(`presence-${roomId}`);

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState<UserPresence>();
        console.log('[Presence] Sync:', state);
        setPresenceState(state);
        
        // Flatten presence state to array of users
        const users = Object.values(state).flat();
        setOnlineUsers(users);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('[Presence] User joined:', key, newPresences);
        newPresences.forEach(presence => onJoin?.(presence as unknown as UserPresence));
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('[Presence] User left:', key, leftPresences);
        leftPresences.forEach(presence => onLeave?.(presence as unknown as UserPresence));
      })
      .subscribe(async (status) => {
        console.log('[Presence] Channel status:', status);
        
        if (status === 'SUBSCRIBED') {
          const userStatus: UserPresence = {
            user_id: userId,
            username,
            status: 'online',
            online_at: new Date().toISOString(),
            metadata
          };

          const trackStatus = await presenceChannel.track(userStatus);
          console.log('[Presence] Track status:', trackStatus);
          setIsTracking(trackStatus === 'ok');
        }
      });

    setChannel(presenceChannel);

    // Update status periodically (heartbeat)
    const heartbeatInterval = setInterval(async () => {
      if (presenceChannel) {
        await presenceChannel.track({
          user_id: userId,
          username,
          status: 'online',
          online_at: new Date().toISOString(),
          metadata
        });
      }
    }, 30000); // 30 seconds

    return () => {
      console.log('[Presence] Cleaning up channel');
      clearInterval(heartbeatInterval);
      supabase.removeChannel(presenceChannel);
      setIsTracking(false);
    };
  }, [roomId, userId, username, metadata, onJoin, onLeave]);

  const updatePresence = async (updates: Partial<UserPresence>) => {
    if (!channel || !isTracking) return;

    const userStatus: UserPresence = {
      user_id: userId,
      username,
      status: 'online',
      online_at: new Date().toISOString(),
      metadata,
      ...updates
    };

    await channel.track(userStatus);
  };

  const setStatus = (status: 'online' | 'idle' | 'offline') => {
    updatePresence({ status });
  };

  return {
    presenceState,
    onlineUsers,
    isTracking,
    channel,
    updatePresence,
    setStatus
  };
}
