"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import {
  Brain,
  Loader2,
  Send,
  ShieldCheck,
  Sparkles,
  Users,
  Wifi,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import {
  type ChatMessage,
  useDynamicRealtime,
} from "@/hooks/useDynamicRealtime";
import { useDynamicPresence } from "@/hooks/useDynamicPresence";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/utils";

export type DynamicServiceName = "ai" | "agi" | "ags";

type DisplayMessage = ChatMessage & { pending?: boolean };

interface ServiceOption {
  label: string;
  description: string;
  placeholder: string;
  tagline: string;
  icon: typeof Sparkles;
}

const SERVICE_OPTIONS: Record<DynamicServiceName, ServiceOption> = {
  ai: {
    label: "Dynamic AI",
    description:
      "Quantitative research copilot blending market structure, macro, and sentiment telemetry.",
    placeholder: "Ask Dynamic AI for market telemetry or fusion research...",
    tagline:
      "Routes telemetry to Dynamic AGI for execution and Dynamic AGS for governance.",
    icon: Sparkles,
  },
  agi: {
    label: "Dynamic AGI",
    description:
      "Autonomous strategist generating execution-ready trading plans across market regimes.",
    placeholder: "Brief Dynamic AGI on a trading scenario...",
    tagline:
      "Optimizes cross-agent collaboration with Dynamic AI and AGS guardrails.",
    icon: Brain,
  },
  ags: {
    label: "Dynamic AGS",
    description:
      "Governance sentinel mapping approvals, risk tiers, and incident response playbooks.",
    placeholder: "Request a governance checklist or risk review...",
    tagline: "Validates orchestrations before they leave the control plane.",
    icon: ShieldCheck,
  },
};

interface AgsPlaybookHighlight {
  highlights: string[];
  context: {
    mission: string;
    cadence: string;
    scenario_focus: string[];
  };
  generatedAt: string;
  language: string;
}

export interface DynamicAIChatProps {
  sessionId?: string;
  initialService?: DynamicServiceName;
  onSessionChange?: (sessionId: string) => void;
}

export function DynamicAIChat({
  sessionId,
  initialService = "agi",
  onSessionChange,
}: DynamicAIChatProps) {
  const { user } = useAuth();
  const [activeSessionId, setActiveSessionId] = useState<string | undefined>(
    sessionId,
  );
  const [service, setService] = useState<DynamicServiceName>(initialService);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [agsPlaybook, setAgsPlaybook] = useState<AgsPlaybookHighlight | null>(
    null,
  );
  const [isLoadingPlaybook, setIsLoadingPlaybook] = useState(false);
  const messageIdsRef = useRef<Set<string>>(new Set());
  const loadRequestRef = useRef(0);
  const messagesRef = useRef<DisplayMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (sessionId && sessionId !== activeSessionId) {
      setActiveSessionId(sessionId);
    }
  }, [sessionId, activeSessionId]);

  const displayName = useMemo(() => {
    if (!user) return undefined;
    const fullName = (user.user_metadata?.full_name as string | undefined) ??
      undefined;
    return fullName || user.email || user.phone || "Trader";
  }, [user]);

  const presenceMetadata = useMemo(
    () => ({ service }),
    [service],
  );

  const {
    onlineUsers,
    isTracking: isPresenceTracking,
    updatePresence,
  } = useDynamicPresence({
    roomId: activeSessionId ?? "dynamic-ai-lobby",
    userId: user?.id ?? null,
    username: displayName,
    metadata: presenceMetadata,
  });

  useEffect(() => {
    if (isPresenceTracking) {
      void updatePresence({
        metadata: { ...presenceMetadata, status: "ready" },
      });
    }
  }, [isPresenceTracking, presenceMetadata, updatePresence]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages.length, scrollToBottom]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const createTempId = useCallback(() => {
    if (
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ) {
      return crypto.randomUUID();
    }

    return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }, []);

  const loadMessages = useCallback(async (targetSession: string) => {
    const requestId = loadRequestRef.current + 1;
    loadRequestRef.current = requestId;
    try {
      setIsHistoryLoading(true);
      const { data, error } = await supabase
        .from("chat_messages")
        .select("id, session_id, role, content, metadata, created_at")
        .eq("session_id", targetSession)
        .order("created_at", { ascending: true });

      if (error) throw error;

      const ordered = (data ?? []).map((entry) => ({
        id: entry.id as string,
        session_id: entry.session_id as string,
        role: entry.role as DisplayMessage["role"],
        content: entry.content as string,
        metadata: entry.metadata as Record<string, unknown> | null,
        created_at: entry.created_at as string,
      }));

      if (loadRequestRef.current !== requestId) {
        return;
      }

      messageIdsRef.current = new Set(ordered.map((item) => item.id));
      messagesRef.current = ordered;
      setMessages(ordered);
    } catch (error) {
      console.error("Failed to load chat history", error);
      toast.error("Unable to load chat history");
    } finally {
      if (loadRequestRef.current === requestId) {
        setIsHistoryLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (activeSessionId) {
      void loadMessages(activeSessionId);
    } else {
      setMessages([]);
      messagesRef.current = [];
      messageIdsRef.current.clear();
    }
  }, [activeSessionId, loadMessages]);

  const mergeIncomingMessage = useCallback((incoming: ChatMessage) => {
    setMessages((previous) => {
      const byIdIndex = previous.findIndex((msg) => msg.id === incoming.id);
      if (byIdIndex !== -1) {
        const next = [...previous];
        next[byIdIndex] = { ...incoming };
        return next;
      }

      const optimisticIndex = previous.findIndex((msg) =>
        msg.id.startsWith("temp-") &&
        msg.role === incoming.role &&
        msg.content.trim() === incoming.content.trim()
      );

      const next = [...previous];
      if (optimisticIndex !== -1) {
        messageIdsRef.current.delete(previous[optimisticIndex].id);
        next[optimisticIndex] = { ...incoming };
      } else {
        next.push({ ...incoming });
      }

      messageIdsRef.current.add(incoming.id);
      next.sort((a, b) => a.created_at.localeCompare(b.created_at));
      return next;
    });
  }, []);

  const handleRealtimeUpdate = useCallback((updated: ChatMessage) => {
    if (!messageIdsRef.current.has(updated.id)) {
      messageIdsRef.current.add(updated.id);
    }

    setMessages((previous) => {
      const exists = previous.some((msg) => msg.id === updated.id);
      if (!exists) {
        return previous;
      }

      return previous.map((msg) =>
        msg.id === updated.id ? { ...msg, ...updated } : msg
      );
    });
  }, []);

  const handleRealtimeDelete = useCallback((removed: ChatMessage) => {
    messageIdsRef.current.delete(removed.id);
    setMessages((previous) => previous.filter((msg) => msg.id !== removed.id));
  }, []);

  const { isConnected: realtimeConnected } = useDynamicRealtime({
    sessionId: activeSessionId,
    onMessage: mergeIncomingMessage,
    onUpdate: handleRealtimeUpdate,
    onDelete: handleRealtimeDelete,
    onError: (error) => {
      console.error("Realtime error", error);
      toast.error("Realtime updates disconnected");
    },
  });

  useEffect(() => {
    if (service !== "ags") return;
    if (agsPlaybook || isLoadingPlaybook) return;

    let isActive = true;

    const fetchPlaybook = async () => {
      try {
        setIsLoadingPlaybook(true);
        const language = typeof window !== "undefined"
          ? navigator.language?.split("-")[0]
          : undefined;
        const { data, error } = await supabase.functions.invoke(
          "dynamic-ags-playbook",
          {
            method: "GET",
            headers: language ? { "accept-language": language } : undefined,
          },
        );
        if (error) throw error;
        if (!data || !isMountedRef.current || !isActive) return;
        setAgsPlaybook(data as AgsPlaybookHighlight);
      } catch (error) {
        console.error("Failed to load AGS playbook", error);
        toast.error("Unable to load AGS playbook context");
      } finally {
        if (isActive && isMountedRef.current) {
          setIsLoadingPlaybook(false);
        }
      }
    };

    void fetchPlaybook();

    return () => {
      isActive = false;
      if (isMountedRef.current) {
        setIsLoadingPlaybook(false);
      }
    };
  }, [service, agsPlaybook, isLoadingPlaybook]);

  const handleServiceChange = useCallback((value: string) => {
    setService(value as DynamicServiceName);
    if (isPresenceTracking) {
      void updatePresence({
        metadata: { service: value, status: "ready" },
      });
    }
  }, [isPresenceTracking, updatePresence]);

  const sendMessage = useCallback(async () => {
    if (isSending) {
      return;
    }

    if (!user) {
      toast.error("Please sign in to chat");
      return;
    }

    const trimmed = input.trim();
    if (!trimmed) return;

    const historyPayload = messagesRef.current
      .filter((msg) => !msg.pending && !msg.id.startsWith("temp-"))
      .map((msg) => ({ role: msg.role, content: msg.content }));

    const optimisticId = `temp-${createTempId()}`;
    const timestamp = new Date().toISOString();

    const optimisticMessage: DisplayMessage = {
      id: optimisticId,
      session_id: activeSessionId ?? "pending",
      role: "user",
      content: trimmed,
      created_at: timestamp,
      metadata: { service },
      pending: true,
    };

    setMessages((previous) => {
      const next = [...previous, optimisticMessage];
      next.sort((a, b) => a.created_at.localeCompare(b.created_at));
      return next;
    });
    messageIdsRef.current.add(optimisticId);
    setInput("");
    setIsSending(true);

    if (isPresenceTracking) {
      void updatePresence({
        status: "online",
        metadata: { ...presenceMetadata, activity: "sending" },
      });
    }

    try {
      const language = typeof window !== "undefined"
        ? navigator.language?.split("-")[0]
        : undefined;

      const response = await supabase.functions.invoke("dynamic-ai-chat", {
        body: {
          session_id: activeSessionId,
          message: trimmed,
          history: historyPayload,
          service,
          language,
          metadata: { client: "web-app" },
        },
      });

      if (response.error) {
        throw response.error;
      }

      const payload = response.data as {
        session_id?: string;
        message?: string;
        service?: DynamicServiceName;
        metadata?: Record<string, unknown>;
      } | null;

      let fetchedNewSession = false;

      if (payload?.session_id && payload.session_id !== activeSessionId) {
        setActiveSessionId(payload.session_id);
        onSessionChange?.(payload.session_id);
        await loadMessages(payload.session_id);
        fetchedNewSession = true;
      }

      if (payload?.message && !fetchedNewSession) {
        const assistantTempId = `temp-${createTempId()}`;
        const assistantMessage: DisplayMessage = {
          id: assistantTempId,
          session_id: payload.session_id ?? activeSessionId ?? "pending",
          role: "assistant",
          content: payload.message,
          created_at: new Date().toISOString(),
          metadata: {
            service: payload.service ?? service,
            ...(payload.metadata ?? {}),
          },
          pending: true,
        };

        setMessages((previous) => {
          const next = [...previous, assistantMessage];
          next.sort((a, b) => a.created_at.localeCompare(b.created_at));
          return next;
        });
        messageIdsRef.current.add(assistantTempId);
      }
    } catch (error) {
      console.error("Failed to send message", error);
      toast.error("Failed to send message");
      setMessages((previous) =>
        previous.filter((msg) => msg.id !== optimisticId)
      );
      messageIdsRef.current.delete(optimisticId);
    } finally {
      setIsSending(false);
      if (isPresenceTracking) {
        void updatePresence({
          metadata: { ...presenceMetadata, status: "ready" },
        });
      }
    }
  }, [
    user,
    input,
    activeSessionId,
    service,
    isPresenceTracking,
    updatePresence,
    presenceMetadata,
    onSessionChange,
    loadMessages,
    createTempId,
    isSending,
  ]);

  const handleInputKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        void sendMessage();
      }
    },
    [sendMessage],
  );

  const serviceOption = SERVICE_OPTIONS[service];
  const ServiceIcon = serviceOption.icon;
  const presenceCount = onlineUsers.length;
  const isInputDisabled = !user || isSending;

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border/60 bg-background/80 px-6 py-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-primary/10 p-2">
              <ServiceIcon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">{serviceOption.label}</h3>
              <p className="text-sm text-muted-foreground">
                {serviceOption.description}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {serviceOption.tagline}
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Select value={service} onValueChange={handleServiceChange}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select service" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(SERVICE_OPTIONS).map(([value, option]) => (
                  <SelectItem key={value} value={value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Badge
                variant={realtimeConnected ? "success" : "secondary"}
                className="flex items-center gap-1"
              >
                <Wifi className="h-3.5 w-3.5" />
                {realtimeConnected ? "Live" : "Offline"}
              </Badge>
              <Badge
                variant={presenceCount > 0 ? "success" : "secondary"}
                className="flex items-center gap-1"
              >
                <Users className="h-3.5 w-3.5" />
                {presenceCount} online
              </Badge>
            </div>
          </div>
        </div>

        {service === "ags" && (
          <div className="mt-4 rounded-lg border border-border/50 bg-muted/10 p-4">
            {isLoadingPlaybook
              ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading AGS governance context...
                </div>
              )
              : agsPlaybook
              ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Mission
                    </p>
                    <p className="text-sm font-medium">
                      {agsPlaybook.context.mission}
                    </p>
                    <p className="mt-2 text-xs uppercase tracking-wide text-muted-foreground">
                      Focus Areas
                    </p>
                    <p className="text-sm">
                      {agsPlaybook.context.scenario_focus.join(", ")}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Priority Initiatives
                    </p>
                    <ul className="mt-1 space-y-1 text-sm">
                      {agsPlaybook.highlights.slice(0, 3).map((highlight) => (
                        <li key={highlight} className="flex items-start gap-2">
                          <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
                          <span>{highlight}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Generated{" "}
                      {new Date(agsPlaybook.generatedAt).toLocaleString()} ·
                      {" "}
                      {agsPlaybook.language.toUpperCase()}
                    </p>
                  </div>
                </div>
              )
              : (
                <p className="text-sm text-muted-foreground">
                  Governance context will activate after your first AGS prompt.
                </p>
              )}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        {isHistoryLoading
          ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />{" "}
              Loading messages...
            </div>
          )
          : messages.length === 0
          ? (
            <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
              <ServiceIcon className="mb-4 h-10 w-10 opacity-40" />
              <p className="max-w-md text-sm">{serviceOption.placeholder}</p>
            </div>
          )
          : (
            <div className="flex flex-col gap-4">
              {messages.map((message) => {
                const isUser = message.role === "user";
                const metadata = (message.metadata ?? {}) as Record<
                  string,
                  unknown
                >;
                const messageService =
                  (metadata.service as DynamicServiceName | undefined) ??
                    service;
                const MessageIcon = SERVICE_OPTIONS[messageService]?.icon ??
                  Brain;
                const usage = metadata.usage as
                  | Record<string, unknown>
                  | undefined;
                const model = metadata.model as string | undefined;
                const tokensIn =
                  usage && typeof usage.prompt_tokens === "number"
                    ? usage.prompt_tokens
                    : undefined;
                const tokensOut =
                  usage && typeof usage.completion_tokens === "number"
                    ? usage.completion_tokens
                    : undefined;
                const serviceTag = typeof metadata.service === "string"
                  ? (metadata.service as string).toUpperCase()
                  : undefined;

                return (
                  <div
                    key={message.id}
                    className={cn(
                      "flex gap-3",
                      isUser ? "justify-end" : "justify-start",
                    )}
                  >
                    {!isUser && (
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <MessageIcon className="h-4 w-4 text-primary" />
                      </div>
                    )}
                    <div
                      className={cn(
                        "relative max-w-[80%] rounded-lg border border-border/50 bg-background/80 p-4 shadow-sm backdrop-blur",
                        isUser &&
                          "bg-primary text-primary-foreground border-primary/40",
                        message.pending && "opacity-75",
                      )}
                    >
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {!isUser && serviceTag && (
                          <Badge
                            variant="secondary"
                            className="text-[10px] uppercase tracking-widest"
                          >
                            {serviceTag}
                          </Badge>
                        )}
                        {message.pending && (
                          <span className="flex items-center gap-1">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            streaming
                          </span>
                        )}
                      </div>
                      <p className="whitespace-pre-wrap text-sm leading-relaxed">
                        {message.content}
                      </p>
                      {!isUser &&
                        (model || tokensIn !== undefined ||
                          tokensOut !== undefined) &&
                        (
                          <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                            {model && <span>Model: {model}</span>}
                            {(tokensIn !== undefined ||
                              tokensOut !== undefined) && (
                              <span>
                                Tokens in/out:{" "}
                                {tokensIn ?? "-"}/{tokensOut ?? "-"}
                              </span>
                            )}
                          </div>
                        )}
                    </div>
                    {isUser && (
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary">
                        <span className="text-sm font-semibold text-primary-foreground">
                          {displayName?.[0]?.toUpperCase() ?? "U"}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
      </div>

      <div className="border-t border-border/60 bg-background/80 px-6 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder={serviceOption.placeholder}
            disabled={isInputDisabled}
            className="flex-1"
          />
          <Button
            onClick={() => void sendMessage()}
            disabled={isInputDisabled || input.trim().length === 0}
            className="sm:w-auto"
          >
            {isSending
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <Send className="h-4 w-4" />}
          </Button>
        </div>
        {!user && (
          <p className="mt-2 text-xs text-muted-foreground">
            Sign in to unlock realtime Dynamic AI copilots.
          </p>
        )}
      </div>
    </div>
  );
}
