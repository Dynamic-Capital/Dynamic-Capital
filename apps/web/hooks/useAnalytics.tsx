"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  supabase,
  SUPABASE_FUNCTIONS_URL,
} from "@/integrations/supabase/client";
import { scheduleIdleTask } from "@/utils/scheduleIdleTask";

// Client-only hook: interacts with window, document, and navigator

export type InteractionData = Record<string, unknown>;

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
const ANALYTICS_ENDPOINT = `${SUPABASE_FUNCTIONS_URL}/web-app-analytics`;

const getRuntimeCrypto = (): Crypto | undefined => {
  if (typeof globalThis === "undefined") return undefined;
  const runtime = globalThis as typeof globalThis & { msCrypto?: Crypto };
  return runtime.crypto ?? runtime.msCrypto;
};

const generateSessionId = (): string => {
  const cryptoApi = getRuntimeCrypto();

  if (!cryptoApi) {
    throw new Error("Secure Crypto API unavailable");
  }

  if (cryptoApi.randomUUID) {
    return `session_${cryptoApi.randomUUID()}`;
  }

  if (cryptoApi.getRandomValues) {
    const randomBytes = new Uint8Array(16);
    cryptoApi.getRandomValues(randomBytes);
    const randomHex = Array.from(randomBytes)
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");

    return `session_${randomHex}`;
  }

  throw new Error("Secure randomness primitives are unavailable");
};

const readStoredSessionId = (): string | null => {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(SESSION_STORAGE_KEY);
};

const persistSessionId = (id: string) => {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(SESSION_STORAGE_KEY, id);
};

export const useAnalytics = () => {
  const sessionId = useRef<string | null>(null);

  const ensureSessionId = useCallback((): string | null => {
    if (sessionId.current) {
      return sessionId.current;
    }

    const stored = readStoredSessionId();
    if (stored) {
      sessionId.current = stored;
      return stored;
    }

    try {
      const newSessionId = generateSessionId();
      sessionId.current = newSessionId;
      persistSessionId(newSessionId);
      return newSessionId;
    } catch (error) {
      if (typeof console !== "undefined") {
        console.warn("Unable to create analytics session identifier", error);
      }
      sessionId.current = null;
      return null;
    }
  }, []);

  useEffect(() => {
    ensureSessionId();
  }, [ensureSessionId]);

  const dispatchAnalyticsEvent = useCallback(
    async (payload: AnalyticsEvent) => {
      try {
        if (
          typeof navigator !== "undefined" &&
          typeof navigator.sendBeacon === "function"
        ) {
          try {
            const blob = new Blob([JSON.stringify(payload)], {
              type: "application/json",
            });
            const dispatched = navigator.sendBeacon(ANALYTICS_ENDPOINT, blob);
            if (dispatched) {
              return;
            }
          } catch (error) {
            if (process.env.NODE_ENV !== "production") {
              console.warn("Falling back to fetch analytics delivery", error);
            }
          }
        }

        const { error } = await supabase.functions.invoke(
          "web-app-analytics",
          { body: payload },
        );

        if (error) {
          console.error("Analytics tracking error:", error);
        }
      } catch (error) {
        console.error("Failed to dispatch analytics payload:", error);
      }
    },
    [],
  );

  const trackEvent = useCallback(async (event: AnalyticsEvent) => {
    try {
      const sessionIdentifier = ensureSessionId();
      const eventWithContext: AnalyticsEvent = {
        ...event,
        ...(sessionIdentifier ? { session_id: sessionIdentifier } : {}),
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

      await scheduleIdleTask(
        () => dispatchAnalyticsEvent(eventWithContext),
        { timeout: 2000 },
      );
    } catch (error) {
      console.error("Failed to track analytics event:", error);
    }
  }, [dispatchAnalyticsEvent, ensureSessionId]);

  const trackPageView = useCallback((
    page?: string,
    extraData?: InteractionData,
  ) => {
    const resolvedPage = page ||
      (typeof window !== "undefined" ? window.location.pathname : undefined);

    trackEvent({
      event_type: "page_view",
      interaction_data: {
        page: resolvedPage,
        timestamp: new Date().toISOString(),
        ...extraData,
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

  const trackPlanView = useCallback((
    planId: string,
    planName?: string,
    extraData?: InteractionData,
  ) => {
    trackEvent({
      event_type: "plan_view",
      interaction_data: {
        plan_id: planId,
        plan_name: planName,
        timestamp: new Date().toISOString(),
        ...extraData,
      },
    });
  }, [trackEvent]);

  const trackCheckoutStart = useCallback((
    planId: string,
    amount?: number,
    extraData?: InteractionData,
  ) => {
    trackEvent({
      event_type: "checkout_start",
      interaction_data: {
        plan_id: planId,
        amount,
        timestamp: new Date().toISOString(),
        ...extraData,
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
