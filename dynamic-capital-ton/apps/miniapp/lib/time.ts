"use client";

export function formatRelativeTime(iso?: string): string {
  if (!iso) {
    return "just now";
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "just now";
  }
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  if (diffMs <= 0) {
    return "just now";
  }
  const diffSeconds = Math.floor(diffMs / 1000);
  if (diffSeconds < 60) {
    return `${diffSeconds}s ago`;
  }
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}
