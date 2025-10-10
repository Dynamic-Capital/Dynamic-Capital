import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface ChatMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: Record<string, any>;
  created_at: string;
}

interface UseDynamicRealtimeOptions {
  sessionId?: string;
  onMessage?: (message: ChatMessage) => void;
  onError?: (error: Error) => void;
}

export function useDynamicRealtime({
  sessionId,
  onMessage,
  onError
}: UseDynamicRealtimeOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!sessionId) return;

    const realtimeChannel = supabase
      .channel(`chat-session-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `session_id=eq.${sessionId}`
        },
        (payload) => {
          const newMessage = payload.new as ChatMessage;
          console.log('[Realtime] New message:', newMessage);
          
          setMessages(prev => [...prev, newMessage]);
          onMessage?.(newMessage);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_messages',
          filter: `session_id=eq.${sessionId}`
        },
        (payload) => {
          const updatedMessage = payload.new as ChatMessage;
          console.log('[Realtime] Updated message:', updatedMessage);
          
          setMessages(prev => 
            prev.map(msg => msg.id === updatedMessage.id ? updatedMessage : msg)
          );
        }
      )
      .subscribe((status) => {
        console.log('[Realtime] Channel status:', status);
        setIsConnected(status === 'SUBSCRIBED');
        
        if (status === 'CHANNEL_ERROR') {
          onError?.(new Error('Failed to connect to realtime channel'));
        }
      });

    setChannel(realtimeChannel);

    return () => {
      console.log('[Realtime] Cleaning up channel');
      supabase.removeChannel(realtimeChannel);
      setIsConnected(false);
    };
  }, [sessionId, onMessage, onError]);

  return {
    messages,
    isConnected,
    channel
  };
}
