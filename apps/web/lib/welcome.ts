import { callEdgeFunction } from "@/config/supabase";

interface ContentBatchEntry {
  content_key: string;
  content_value: string;
}

interface ContentBatchResponse {
  contents?: ContentBatchEntry[];
}

interface PlansResponseEntry {
  id: string;
  duration_months: number | null;
  is_lifetime: boolean | null;
}

interface PlansResponse {
  plans?: PlansResponseEntry[];
}

export interface WelcomeContent {
  raw: string;
  lines: string[];
}

export interface PlanIdentifier {
  id: string;
  durationMonths: number | null;
  isLifetime: boolean | null;
}

export interface WelcomePlans {
  plans: PlanIdentifier[];
  monthly?: PlanIdentifier;
  lifetime?: PlanIdentifier;
}

export async function fetchWelcomeContent(): Promise<WelcomeContent> {
  const fallbackMessage =
    "Professional Trading • Premium Signals • VIP Support";

  try {
    const { data, error } = await callEdgeFunction<ContentBatchResponse>(
      "CONTENT_BATCH",
      {
        method: "POST",
        body: { keys: ["welcome_message"] },
      },
    );

    if (error || !data?.contents?.length) {
      return {
        raw: fallbackMessage,
        lines: fallbackMessage.split("\n").map((line) => line.trim()).filter(
          Boolean,
        ),
      };
    }

    const welcomeEntry = data.contents.find((entry) =>
      entry.content_key === "welcome_message"
    );

    const rawMessage = welcomeEntry?.content_value?.trim() ?? fallbackMessage;

    return {
      raw: rawMessage,
      lines: rawMessage
        .split("\n")
        .map((line) => line.replace(/\p{Extended_Pictographic}/gu, "").trim())
        .filter(Boolean),
    };
  } catch (error) {
    console.error("Failed to fetch welcome content", error);
    return {
      raw: fallbackMessage,
      lines: fallbackMessage.split("\n").map((line) => line.trim()).filter(
        Boolean,
      ),
    };
  }
}

export async function fetchWelcomePlans(): Promise<WelcomePlans> {
  try {
    const { data, error } = await callEdgeFunction<PlansResponse>("PLANS");

    if (error || !data?.plans?.length) {
      return { plans: [] };
    }

    const plans = data.plans.map((plan) => ({
      id: plan.id,
      durationMonths: plan.duration_months,
      isLifetime: Boolean(plan.is_lifetime ?? false),
    }));

    const monthly = plans.find((plan) =>
      plan.durationMonths === 1 && !plan.isLifetime
    );
    const lifetime = plans.find((plan) => plan.isLifetime);

    return {
      plans,
      monthly,
      lifetime,
    };
  } catch (error) {
    console.error("Failed to fetch welcome plan metadata", error);
    return { plans: [] };
  }
}
