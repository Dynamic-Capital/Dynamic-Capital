"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  HeadphonesIcon,
  MessageSquare,
  PhoneCall,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { ContactLink } from "./types";
import { ViewHeader } from "./ViewHeader";

interface SupportViewProps {
  onBack: () => void;
}

const formatLinkHref = (url: string) => {
  if (!url) return "#";
  if (url.startsWith("http")) return url;
  if (url.startsWith("@")) return `https://t.me/${url.slice(1)}`;
  if (url.startsWith("mailto:")) return url;
  if (url.includes("@")) return `mailto:${url}`;
  return url;
};

export function SupportView({ onBack }: SupportViewProps) {
  const [links, setLinks] = useState<ContactLink[]>([]);
  const [supportMessage, setSupportMessage] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadSupportData = async () => {
      try {
        setLoading(true);
        const [linksResponse, contentResponse] = await Promise.all([
          supabase.functions.invoke("contact-links", { method: "GET" }),
          supabase.functions.invoke("content-batch", {
            body: { keys: ["support_message"] },
          }),
        ]);

        if (linksResponse.error) {
          throw linksResponse.error;
        }
        if (contentResponse.error) {
          throw contentResponse.error;
        }

        if (!isMounted) return;

        const fetchedLinks = Array.isArray(linksResponse.data?.data)
          ? (linksResponse.data?.data as ContactLink[])
          : [];

        const supportContent = Array.isArray(contentResponse.data?.contents)
          ? (contentResponse.data?.contents as {
            content_key?: string;
            content_value?: string;
          }[]).find((item) => item.content_key === "support_message")
          : undefined;

        setLinks(fetchedLinks);
        setSupportMessage(
          supportContent?.content_value ??
            "Our support team is here to help. Contact us anytime!",
        );
        setError(null);
      } catch (err) {
        if (!isMounted) return;
        console.error("Error loading support data:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load support information",
        );
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadSupportData();
    return () => {
      isMounted = false;
    };
  }, []);

  const renderSkeleton = () => (
    <>
      <Card className="p-6 bg-gradient-to-br from-background to-muted border-0 shadow-lg">
        <Skeleton className="h-5 w-1/3 mb-4" />
        <Skeleton className="h-20 w-full" />
      </Card>
      <Card className="p-6 bg-gradient-to-br from-background to-muted border-0 shadow-lg">
        <Skeleton className="h-6 w-1/4 mb-4" />
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={`support-skeleton-${index}`}
              className="flex items-center gap-4"
            >
              <Skeleton className="h-10 w-10 rounded-full" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      </Card>
    </>
  );

  return (
    <div className="space-y-6">
      <ViewHeader
        title="Customer Support"
        description="Manage user inquiries and support channels"
        onBack={onBack}
      />

      {error && (
        <Alert variant="destructive" className="flex items-start gap-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading
        ? (
          renderSkeleton()
        )
        : (
          <>
            <Card className="p-6 bg-gradient-to-br from-background to-muted border-0 shadow-lg">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-3">
                  <div className="inline-flex items-center gap-2 rounded-lg bg-dc-brand/10 px-3 py-1 text-sm font-medium text-dc-brand">
                    <HeadphonesIcon className="h-4 w-4" />
                    24/7 support desk
                  </div>
                  <div className="prose prose-sm max-w-none text-muted-foreground">
                    {supportMessage
                      .split("\n")
                      .filter((line) => line.trim().length > 0)
                      .map((line, index) => (
                        <p key={`support-line-${index}`}>{line}</p>
                      ))}
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Badge variant="outline" className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Tickets sync with Telegram bot
                  </Badge>
                  <Badge variant="outline" className="flex items-center gap-2">
                    <PhoneCall className="h-4 w-4" />
                    Escalations monitored hourly
                  </Badge>
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-gradient-to-br from-background to-muted border-0 shadow-lg">
              <h3 className="text-lg font-semibold mb-4">
                Contact channels ({links.length})
              </h3>
              {links.length === 0
                ? (
                  <p className="text-sm text-muted-foreground">
                    No contact links configured. Add channels in Supabase to
                    make them available here and in the Telegram bot.
                  </p>
                )
                : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {links.map((link) => (
                      <div
                        key={`${link.display_name}-${link.url}`}
                        className="rounded-lg border border-border/40 bg-background/40 p-4"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">
                              {link.icon_emoji ?? "💬"}
                            </span>
                            <div>
                              <p className="font-semibold">
                                {link.display_name}
                              </p>
                              {link.platform && (
                                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                                  {link.platform}
                                </p>
                              )}
                            </div>
                          </div>
                          <Badge variant="outline">Active</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground break-all mb-3">
                          {link.url}
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          href={formatLinkHref(link.url)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Open channel
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
            </Card>
          </>
        )}
    </div>
  );
}
