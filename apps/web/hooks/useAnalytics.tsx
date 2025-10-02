"use client";

import { useCallback, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

// Client-only hook: interacts with window, document, and navigator

type InteractionData = Record<string, unknown>;

interface AnalyticsEvent {
  event_type: string;
  telegram_user_id?: string;
  session_id?: string;
  page_context?: string;
  interaction_data?: InteractionData;
  user_agent?: string;
  referrer?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
}

const SESSION_STORAGE_KEY = "analytics_session_id";

const generateSessionId = () => {
  if (typeof window !== "undefined") {
    const cryptoObject = window.crypto ?? (window as typeof window & {
      msCrypto?: Crypto;
    }).msCrypto;

    if (cryptoObject?.getRandomValues) {
      const randomBytes = new Uint8Array(16);
      cryptoObject.getRandomValues(randomBytes);
      const randomHex = Array.from(randomBytes)
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("");

      return `session_${randomHex}`;
    }
  }

  const timestamp = Date.now().toString(36);
  const perfTime = typeof performance !== "undefined"
    ? Math.floor(performance.now() * 1000).toString(36)
    : "";

  return `session_${timestamp}${perfTime}`;
};

export const useAnalytics = () => {
  const sessionId = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const storedSessionId = sessionStorage.getItem(SESSION_STORAGE_KEY);

    if (storedSessionId) {
      sessionId.current = storedSessionId;
      return;
    }

    const newSessionId = generateSessionId();
    sessionId.current = newSessionId;
    sessionStorage.setItem(SESSION_STORAGE_KEY, newSessionId);
  }, []);

  const trackEvent = useCallback(async (event: AnalyticsEvent) => {
    try {
      const eventWithContext: AnalyticsEvent = {
        ...event,
        session_id: sessionId.current,
      };
      if (typeof window !== "undefined") {
        eventWithContext.user_agent = navigator.userAgent;
        eventWithContext.referrer = document.referrer;
        eventWithContext.page_context = window.location.pathname +
          window.location.search;

        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get("utm_source")) {
          eventWithContext.utm_source = urlParams.get("utm_source")!;
        }
        if (urlParams.get("utm_medium")) {
          eventWithContext.utm_medium = urlParams.get("utm_medium")!;
        }
        if (urlParams.get("utm_campaign")) {
          eventWithContext.utm_campaign = urlParams.get("utm_campaign")!;
        }
      }

      // Call analytics edge function
      const { error } = await supabase.functions.invoke(
        "web-app-analytics",
        {
          body: eventWithContext,
        },
      );

      if (error) {
        console.error("Analytics tracking error:", error);
      }
    } catch (error) {
      console.error("Failed to track analytics event:", error);
    }
  }, []);

  const trackPageView = useCallback((page?: string) => {
    trackEvent({
      event_type: "page_view",
      interaction_data: {
        page: page ||
          (typeof window !== "undefined"
            ? window.location.pathname
            : undefined),
        timestamp: new Date().toISOString(),
      },
    });
  }, [trackEvent]);

  const trackButtonClick = useCallback((
    buttonId: string,
    extraData?: InteractionData,
  ) => {
    trackEvent({
      event_type: "button_click",
      interaction_data: {
        button_id: buttonId,
        timestamp: new Date().toISOString(),
        ...extraData,
      },
    });
  }, [trackEvent]);

  const trackPlanView = useCallback((planId: string, planName?: string) => {
    trackEvent({
      event_type: "plan_view",
      interaction_data: {
        plan_id: planId,
        plan_name: planName,
        timestamp: new Date().toISOString(),
      },
    });
  }, [trackEvent]);

  const trackCheckoutStart = useCallback((planId: string, amount?: number) => {
    trackEvent({
      event_type: "checkout_start",
      interaction_data: {
        plan_id: planId,
        amount,
        timestamp: new Date().toISOString(),
      },
    });
  }, [trackEvent]);

  const trackPromoApplied = useCallback(
    (promoCode: string, planId?: string, discountAmount?: number) => {
      trackEvent({
        event_type: "promo_applied",
        interaction_data: {
          promo_code: promoCode,
          plan_id: planId,
          discount_amount: discountAmount,
          timestamp: new Date().toISOString(),
        },
      });
    },
    [trackEvent],
  );

  const trackSocialClick = useCallback((platform: string, url: string) => {
    trackEvent({
      event_type: "social_click",
      interaction_data: {
        platform,
        url,
        timestamp: new Date().toISOString(),
      },
    });
  }, [trackEvent]);

  const trackTelegramUser = useCallback((telegramUserId: string) => {
    // Store telegram user ID for future events in this session
    if (typeof window !== "undefined") {
      sessionStorage.setItem("telegram_user_id", telegramUserId);
    }

    trackEvent({
      event_type: "telegram_user_identified",
      telegram_user_id: telegramUserId,
      interaction_data: {
        timestamp: new Date().toISOString(),
      },
    });
  }, [trackEvent]);

  // Enhanced tracking with telegram user context
  const trackWithTelegramContext = useCallback(
    (event: Omit<AnalyticsEvent, "telegram_user_id">) => {
      const telegramUserId = typeof window !== "undefined"
        ? sessionStorage.getItem("telegram_user_id")
        : null;
      trackEvent({
        ...event,
        telegram_user_id: telegramUserId || undefined,
      });
    },
    [trackEvent],
  );

  return {
    trackEvent,
    trackPageView,
    trackButtonClick,
    trackPlanView,
    trackCheckoutStart,
    trackPromoApplied,
    trackSocialClick,
    trackTelegramUser,
    trackWithTelegramContext,
  };
};
