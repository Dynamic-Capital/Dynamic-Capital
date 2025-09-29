"use client";

import { useMemo } from "react";
import { ArrowUpRight, MessageSquarePlus, Mic, Send } from "lucide-react";

import { haptic } from "@/lib/telegram";
import { track } from "@/lib/metrics";

type ChatMessage = {
  id: string;
  sender: "mentor" | "member";
  content: string;
  timestamp: string;
};

export default function MentorChat() {
  const conversation = useMemo<ChatMessage[]>(
    () => [
      {
        id: "1",
        sender: "mentor",
        content:
          "Morning! Let's focus on BTC range behavior before New York open.",
        timestamp: "07:45",
      },
      {
        id: "2",
        sender: "member",
        content: "Copy that. Watching liquidity at $68.2k and $69k.",
        timestamp: "07:46",
      },
      {
        id: "3",
        sender: "mentor",
        content:
          "Great. Queue the VWAP reversion playbook and ping if delta flips.",
        timestamp: "07:48",
      },
    ],
    [],
  );

  return (
    <div className="grid gap-4">
      <section className="card" style={{ display: "grid", gap: 16 }}>
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <h2 style={{ margin: 0 }}>Mentor Chat</h2>
            <p className="muted" style={{ margin: 0 }}>
              Your direct line to the Dynamic Capital trading desk.
            </p>
          </div>
          <button
            className="btn"
            style={{
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.12)",
            }}
            onClick={() => {
              haptic("medium");
              void track("mentorship_schedule_call");
            }}
          >
            <MessageSquarePlus size={16} />
            Schedule call
          </button>
        </header>
        <div style={{ display: "grid", gap: 12 }}>
          {conversation.map((message) => (
            <div
              key={message.id}
              style={{
                display: "flex",
                flexDirection: message.sender === "mentor"
                  ? "row"
                  : "row-reverse",
                alignItems: "flex-start",
                gap: 12,
              }}
            >
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 36,
                  height: 36,
                  borderRadius: 14,
                  background: message.sender === "mentor"
                    ? "rgba(110,231,183,0.12)"
                    : "rgba(125,211,252,0.12)",
                  fontWeight: 600,
                }}
              >
                {message.sender === "mentor" ? "DC" : "You"}
              </span>
              <div
                style={{
                  display: "grid",
                  gap: 6,
                  maxWidth: "75%",
                  textAlign: message.sender === "mentor" ? "left" : "right",
                }}
              >
                <p
                  style={{
                    margin: 0,
                    color: "var(--brand-text)",
                    fontSize: 14,
                  }}
                >
                  {message.content}
                </p>
                <span className="muted" style={{ fontSize: 11 }}>
                  {message.timestamp}
                </span>
              </div>
            </div>
          ))}
        </div>
        <div
          style={{
            display: "flex",
            gap: 12,
            alignItems: "center",
            borderTop: "1px solid rgba(255,255,255,0.08)",
            paddingTop: 12,
          }}
        >
          <button
            className="btn"
            style={{
              width: 44,
              height: 44,
              borderRadius: 16,
              padding: 0,
            }}
            onClick={() => {
              haptic("light");
              void track("mentorship_voice_note");
            }}
          >
            <Mic size={18} />
          </button>
          <div
            style={{
              flex: 1,
              borderRadius: 16,
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.08)",
              padding: "10px 16px",
              color: "var(--brand-text)",
              fontSize: 14,
            }}
          >
            Draft your response…
          </div>
          <button
            className="btn"
            style={{
              width: 44,
              height: 44,
              borderRadius: 16,
              padding: 0,
            }}
            onClick={() => {
              haptic("medium");
              void track("mentorship_send_message");
            }}
          >
            <Send size={18} />
          </button>
        </div>
      </section>

      <button
        className="btn"
        style={{ justifyContent: "center" }}
        onClick={() => {
          haptic("medium");
          void track("mentorship_view_curriculum");
        }}
      >
        <ArrowUpRight size={18} />
        Browse learning curriculum
      </button>
    </div>
  );
}
