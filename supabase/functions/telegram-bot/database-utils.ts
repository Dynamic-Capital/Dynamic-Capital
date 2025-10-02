// Database utility functions for the Telegram bot
import { createClient } from "../_shared/client.ts";

let supabaseAdmin: ReturnType<typeof createClient>;
try {
  supabaseAdmin = createClient("service");
} catch {
  // will surface when client is used
  supabaseAdmin = {} as ReturnType<typeof createClient>;
}

type SupaMockState = {
  tables?: Record<string, unknown[]>;
};

type GlobalWithSupaMock = typeof globalThis & {
  __SUPA_MOCK__?: SupaMockState;
};

function readMockTableRows<T>(table: string): T[] | null {
  const globalState = (globalThis as GlobalWithSupaMock).__SUPA_MOCK__;
  const rows = globalState?.tables?.[table];
  return Array.isArray(rows) ? [...rows as T[]] : null;
}

function toComparable(value: unknown): number | string {
  if (value === null || value === undefined) return Number.POSITIVE_INFINITY;
  if (typeof value === "number") return value;
  if (typeof value === "boolean") return value ? 1 : 0;
  if (value instanceof Date) return value.getTime();
  if (typeof value === "string") {
    const timestamp = Date.parse(value);
    if (!Number.isNaN(timestamp)) return timestamp;
    return value;
  }
  return JSON.stringify(value);
}

function sortRowsByColumn<T>(
  rows: T[],
  column: string,
  ascending: boolean,
): T[] {
  const sorted = [...rows].sort((a, b) => {
    const recordA = a as Record<string, unknown>;
    const recordB = b as Record<string, unknown>;
    const comparableA = toComparable(recordA[column]);
    const comparableB = toComparable(recordB[column]);

    if (typeof comparableA === "number" && typeof comparableB === "number") {
      return comparableA - comparableB;
    }

    return String(comparableA).localeCompare(String(comparableB));
  });

  return ascending ? sorted : sorted.reverse();
}

async function runListQuery<T>(
  builder: any,
  options: {
    table: string;
    orderBy?: string;
    ascending?: boolean;
    errorMessage: string;
  },
): Promise<T[]> {
  const { table, orderBy, ascending = true, errorMessage } = options;
  const supportsOrder = typeof builder?.order === "function";

  try {
    const result = supportsOrder && orderBy
      ? await builder.order(orderBy, { ascending })
      : await builder;

    if (result?.error) {
      console.error(errorMessage, result.error);
      const fallback = readMockTableRows<T>(table);
      if (fallback) {
        return orderBy
          ? sortRowsByColumn(fallback, orderBy, ascending)
          : fallback;
      }
      return [];
    }

    let rows = Array.isArray(result?.data) ? result.data as T[] : null;

    if (!rows) {
      const fallback = readMockTableRows<T>(table);
      if (fallback) {
        return orderBy
          ? sortRowsByColumn(fallback, orderBy, ascending)
          : fallback;
      }
      rows = [];
    }

    if (orderBy && !supportsOrder) {
      return sortRowsByColumn(rows, orderBy, ascending);
    }

    return rows;
  } catch (error) {
    console.error(errorMessage, error);
    const fallback = readMockTableRows<T>(table);
    if (fallback) {
      return orderBy
        ? sortRowsByColumn(fallback, orderBy, ascending)
        : fallback;
    }
    return [];
  }
}

interface VipPackage {
  id: string;
  name: string;
  price: number;
  currency: string;
  duration_months: number;
  is_lifetime: boolean;
  features: string[];
}

// Content management functions
export async function getBotContent(
  contentKey: string,
): Promise<string | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from("bot_content")
      .select("content_value")
      .eq("content_key", contentKey)
      .eq("is_active", true)
      .single();

    if (error) {
      console.error(`Error fetching content for ${contentKey}:`, error);

      // If content doesn't exist, create default content
      if (error.code === "PGRST116") {
        console.log(`Creating default content for ${contentKey}`);
        const defaultContent = await createDefaultContent(contentKey);
        return defaultContent;
      }
      return null;
    }

    return data?.content_value || null;
  } catch (error) {
    console.error(`Exception in getBotContent for ${contentKey}:`, error);
    return null;
  }
}

// Create default content for missing keys
async function createDefaultContent(
  contentKey: string,
): Promise<string | null> {
  const defaultContents: Record<string, string> = {
    "welcome_message": `🏁 Welcome to Dynamic Capital!

📊 Institutional-grade trade intelligence on demand
⚡ Live signals with human + automation oversight
🎓 Progression tracks to scale from first trade to managed capital

Use the menu or try commands like /packages, /education, /promo, /dashboard, or /support to get started.`,
    "welcome_back_message": `👋 Welcome back to Dynamic Capital!

Here's what's live right now:
• 📈 Alpha Signals – intraday & swing setups with risk levels
• 🧠 Mentorship Tracks – tighten discipline and execution
• 🤖 Automation Access – connect bots once your review clears

Quick commands:
• /dashboard — view your status & receipts
• /packages — compare VIP routes
• /education — unlock training tracks
• /support — reach the concierge desk

Let us know if you need anything.`,
    "about_us": `🏢 About Dynamic Capital

Dynamic Capital pairs senior analysts with automation so every member receives:
• Institutional-grade trade ideas with transparent performance
• Structured mentorship paths that level up risk governance
• Concierge support that keeps you accountable to the playbook

We operate across timezones to keep members synced with the desk.`,
    "support_message": `🛟 *Need Help?*

Our support team is here for you!

📧 Support: support@dynamiccapital.ton
💬 Telegram: @DynamicCapital_Support
📣 Marketing: marketing@dynamiccapital.ton
🕐 Support Hours: 24/7

We typically respond within 2-4 hours.`,
    "terms_conditions": `📋 Terms & Policies

By using Dynamic Capital you acknowledge:
• Trading involves risk; results are never guaranteed
• Signals and automation are educational guidance only
• Access is personal and monitored for compliance
• Refunds follow the onboarding guarantee outlined in your plan

Full terms: https://dynamic.capital/terms`,
    "help_message": `❓ Bot Commands & Shortcuts

/start — reopen the main menu
/dashboard — view status, receipts, and automation
/packages — compare VIP routes
/promo — check active incentives
/vip — review membership benefits
/education — browse training tracks
/support — contact the concierge desk
/ask QUESTION — get AI coaching
/shouldibuy SYMBOL — request an educational breakdown
/about — learn more about Dynamic Capital

Need a human? Message @DynamicCapital_Support.`,
    "faq_general": `❓ Frequently Asked Questions

🔹 How do I join VIP?
Select a package, follow the payment instructions, and upload your receipt. The desk verifies within 24 hours.

🔹 What payments are supported?
USDT (TRC20) and vetted bank transfers. Concierge will route you to the correct channel.

🔹 How fast are signals delivered?
The desk streams intraday calls in real time with clear entry, stop, and target guidance.

🔹 What else is included?
Mentorship pathways, automation access once approved, and daily debriefs so you stay aligned.

🔹 Can I cancel?
Yes. You retain access until the end of your current billing window.

Still stuck? Reach out via /support.`,
    "vip_benefits": `💎 VIP Membership Benefits

🚀 Real-time signal desk with analyst commentary
📊 Performance dashboards and accountability reviews
🧠 Mentorship sprints tailored to your trading tier
🤖 Automation hooks once your risk review clears
🛎️ Concierge support around the clock
🎁 Members-only promotions and capital unlocks`,
    "payment_instructions": `💳 Payment Instructions

We currently accept:
🏦 Bank transfer through our vetted partners
🪙 USDT (TRC20) sent to the treasury address

After payment:
1. Capture the receipt or transaction hash.
2. Upload it here so the desk can verify ownership.
3. Our team confirms and activates your access within 24 hours (often sooner).

Need help with payment routing? Use /support.`,
  };

  const defaultValue = defaultContents[contentKey];
  if (!defaultValue) return null;

  try {
    const { data, error } = await supabaseAdmin
      .from("bot_content")
      .insert({
        content_key: contentKey,
        content_value: defaultValue,
        content_type: "text",
        description: `Auto-generated default content for ${contentKey}`,
        is_active: true,
        created_by: "system",
        last_modified_by: "system",
      })
      .select("content_value")
      .single();

    if (error) {
      console.error(`Error creating default content for ${contentKey}:`, error);
      return null;
    }

    return data?.content_value || null;
  } catch (error) {
    console.error(
      `Exception creating default content for ${contentKey}:`,
      error,
    );
    return null;
  }
}

export async function setBotContent(
  contentKey: string,
  contentValue: string,
  adminId: string,
): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin
      .from("bot_content")
      .upsert({
        content_key: contentKey,
        content_value: contentValue,
        last_modified_by: adminId,
      }, {
        onConflict: "content_key",
      });

    if (!error) {
      // Log admin action
      await logAdminAction(
        adminId,
        "content_update",
        `Updated content: ${contentKey}`,
        "bot_content",
        undefined,
        {},
        { content_key: contentKey, content_value: contentValue },
      );
    }

    return !error;
  } catch (error) {
    console.error("Exception in setBotContent:", error);
    return false;
  }
}

// Settings management functions
export async function getBotSetting(
  settingKey: string,
): Promise<string | null> {
  try {
    const { data, error: _error } = await supabaseAdmin
      .from("bot_settings")
      .select("setting_value")
      .eq("setting_key", settingKey)
      .eq("is_active", true)
      .single();

    return data?.setting_value || null;
  } catch (error) {
    console.error(`Error fetching setting ${settingKey}:`, error);
    return null;
  }
}

export async function setBotSetting(
  settingKey: string,
  settingValue: string,
  adminId: string,
): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin
      .from("bot_settings")
      .upsert({
        setting_key: settingKey,
        setting_value: settingValue,
      });

    if (!error) {
      await logAdminAction(
        adminId,
        "setting_update",
        `Updated setting: ${settingKey}`,
        "bot_settings",
        undefined,
        {},
        { setting_key: settingKey, setting_value: settingValue },
      );
    }

    return !error;
  } catch (error) {
    console.error("Exception in setBotSetting:", error);
    return false;
  }
}

export async function getAllBotSettings(): Promise<Record<string, string>> {
  try {
    const { data, error } = await supabaseAdmin
      .from("bot_settings")
      .select("setting_key, setting_value");

    if (error) {
      console.error("Error fetching all bot settings:", error);
      return {};
    }

    const settings: Record<string, string> = {};
    (data ?? []).forEach(
      (s: { setting_key: string; setting_value: string }) => {
        settings[s.setting_key] = s.setting_value;
      },
    );
    return settings;
  } catch (error) {
    console.error("Exception in getAllBotSettings:", error);
    return {};
  }
}

export async function resetBotSettings(
  defaultSettings: Record<string, string>,
  adminId: string,
): Promise<boolean> {
  try {
    const rows = Object.entries(defaultSettings).map(([key, value]) => ({
      setting_key: key,
      setting_value: value,
    }));

    const { error } = await supabaseAdmin
      .from("bot_settings")
      .upsert(rows, { onConflict: "setting_key" });

    if (!error) {
      await logAdminAction(
        adminId,
        "settings_reset",
        "Reset all bot settings",
        "bot_settings",
        undefined,
        {},
        defaultSettings,
      );
    }

    return !error;
  } catch (error) {
    console.error("Exception in resetBotSettings:", error);
    return false;
  }
}

// VIP package management functions
export async function getVipPackages(): Promise<VipPackage[]> {
  if (typeof supabaseAdmin?.from !== "function") {
    return readMockTableRows<VipPackage>("subscription_plans") ?? [];
  }

  return await runListQuery<VipPackage>(
    supabaseAdmin.from<VipPackage>("subscription_plans").select("*"),
    {
      table: "subscription_plans",
      orderBy: "price",
      ascending: true,
      errorMessage: "Error fetching VIP packages:",
    },
  );
}

// Enhanced VIP packages display with better formatting
export async function getFormattedVipPackages(): Promise<string> {
  const packages = await getVipPackages();

  if (packages.length === 0) {
    return "💎 *VIP Membership Packages*\n\n❌ No packages available at the moment.";
  }

  let message =
    `💎 *VIP Membership Packages*\n\n🚀 *Unlock Premium Trading Success!*\n\n`;

  packages.forEach((pkg, index) => {
    const discount = pkg.duration_months >= 12
      ? "🔥 BEST VALUE"
      : pkg.duration_months >= 6
      ? "⭐ POPULAR"
      : pkg.duration_months >= 3
      ? "💫 SAVE MORE"
      : "🎯 STARTER";

    const monthlyEquivalent = pkg.duration_months > 0
      ? `($${(pkg.price / pkg.duration_months).toFixed(0)}/month)`
      : "";

    const savingsInfo = pkg.duration_months >= 12
      ? "💰 Save 35%"
      : pkg.duration_months >= 6
      ? "💰 Save 20%"
      : pkg.duration_months >= 3
      ? "💰 Save 15%"
      : "";

    message += `${index + 1}. **${pkg.name}** ${discount}\n`;
    message += `   💰 **${pkg.currency} ${pkg.price}**`;

    if (pkg.is_lifetime) {
      message += ` - *Lifetime Access*\n`;
    } else {
      message += `/${pkg.duration_months}mo ${monthlyEquivalent}\n`;
      if (savingsInfo) message += `   ${savingsInfo}\n`;
    }

    message += `   ✨ **Features:**\n`;
    if (pkg.features && Array.isArray(pkg.features)) {
      pkg.features.forEach((feature: string) => {
        message += `      • ${feature}\n`;
      });
    }

    if (pkg.is_lifetime) {
      message += `      • 🌟 All future programs included\n`;
      message += `      • 🔐 Exclusive lifetime member content\n`;
    }

    message += `\n`;
  });

  message += `🎁 *Special Benefits:*\n`;
  message += `• 📈 Real-time trading signals\n`;
  message += `• 🏆 VIP community access\n`;
  message += `• 📊 Daily market analysis\n`;
  message += `• 🎓 Educational resources\n`;
  message += `• 💬 Direct mentor support\n\n`;

  message +=
    `✅ *Ready to level up your trading?*\nSelect a package below to get started!`;
  message += `\n\n🎁 Have a promo code? Use /promo to select and apply it.`;

  return message;
}

export async function createVipPackage(
  packageData: VipPackage,
  adminId: string,
): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin
      .from("subscription_plans")
      .insert(packageData);

    if (!error) {
      await logAdminAction(
        adminId,
        "package_create",
        `Created VIP package: ${packageData.name}`,
        "subscription_plans",
        undefined,
        {},
        packageData as unknown as Record<string, unknown>,
      );
    }

    return !error;
  } catch (error) {
    console.error("Exception in createVipPackage:", error);
    return false;
  }
}

export async function updateVipPackage(
  packageId: string,
  packageData: Partial<VipPackage>,
  adminId: string,
): Promise<boolean> {
  try {
    console.log("Updating VIP package:", { packageId, packageData, adminId });

    const { error } = await supabaseAdmin
      .from("subscription_plans")
      .update(packageData)
      .eq("id", packageId);

    if (error) {
      console.error("Database error updating VIP package:", error);
      return false;
    }

    if (!error) {
      await logAdminAction(
        adminId,
        "package_update",
        `Updated VIP package: ${packageId}`,
        "subscription_plans",
        packageId,
        {},
        packageData,
      );
    }

    return !error;
  } catch (error) {
    console.error("Exception in updateVipPackage:", error);
    return false;
  }
}

// Process text input for plan editing
interface PlanEditSession {
  plan_id?: string;
  awaiting_input?: string;
}

export async function processPlanEditInput(
  userId: string,
  inputText: string,
  sessionData: PlanEditSession,
): Promise<{ success: boolean; message: string; planId?: string }> {
  try {
    const { plan_id: planId, awaiting_input } = sessionData;

    if (!planId) {
      return {
        success: false,
        message: "❌ Session data corrupted. Please start over.",
      };
    }

    switch (awaiting_input) {
      case "plan_price": {
        const price = parseFloat(inputText.trim());
        if (isNaN(price) || price <= 0) {
          return {
            success: false,
            message:
              "❌ Invalid price. Please enter a valid number (e.g., 49.99)",
          };
        }

        const { error } = await supabaseAdmin
          .from("subscription_plans")
          .update({
            price: price,
          })
          .eq("id", planId);

        if (error) {
          console.error("Error updating plan price:", error);
          return {
            success: false,
            message: `❌ Database error: ${error.message}`,
          };
        }

        await logAdminAction(
          userId,
          "plan_price_update",
          `Updated plan price to $${price}`,
          "subscription_plans",
          planId,
        );
        return {
          success: true,
          message: `✅ Price updated to $${price} successfully!`,
          planId,
        };
      }

      case "plan_name": {
        const name = inputText.trim();
        if (!name || name.length < 3) {
          return {
            success: false,
            message: "❌ Plan name must be at least 3 characters long.",
          };
        }

        const { error } = await supabaseAdmin
          .from("subscription_plans")
          .update({
            name: name,
          })
          .eq("id", planId);

        if (error) {
          console.error("Error updating plan name:", error);
          return {
            success: false,
            message: `❌ Database error: ${error.message}`,
          };
        }

        await logAdminAction(
          userId,
          "plan_name_update",
          `Updated plan name to "${name}"`,
          "subscription_plans",
          planId,
        );
        return {
          success: true,
          message: `✅ Plan name updated to "${name}" successfully!`,
          planId,
        };
      }

      case "plan_duration": {
        const input = inputText.trim().toLowerCase();
        let isLifetime = false;
        let durationMonths = 0;

        if (input === "lifetime") {
          isLifetime = true;
          durationMonths = 0;
        } else {
          const duration = parseInt(input);
          if (isNaN(duration) || duration <= 0) {
            return {
              success: false,
              message:
                "❌ Invalid duration. Enter a number (e.g., 12) or 'lifetime'",
            };
          }
          durationMonths = duration;
        }

        const { error } = await supabaseAdmin
          .from("subscription_plans")
          .update({
            duration_months: durationMonths,
            is_lifetime: isLifetime,
          })
          .eq("id", planId);

        if (error) {
          console.error("Error updating plan duration:", error);
          return {
            success: false,
            message: `❌ Database error: ${error.message}`,
          };
        }

        const durationText = isLifetime
          ? "Lifetime"
          : `${durationMonths} months`;
        await logAdminAction(
          userId,
          "plan_duration_update",
          `Updated plan duration to ${durationText}`,
          "subscription_plans",
          planId,
        );
        return {
          success: true,
          message: `✅ Duration updated to ${durationText} successfully!`,
          planId,
        };
      }

      case "plan_add_feature": {
        const feature = inputText.trim();
        if (!feature || feature.length < 3) {
          return {
            success: false,
            message:
              "❌ Feature description must be at least 3 characters long.",
          };
        }

        // Get current features
        const { data: plan, error: fetchError } = await supabaseAdmin
          .from("subscription_plans")
          .select("features")
          .eq("id", planId)
          .single();

        if (fetchError || !plan) {
          return {
            success: false,
            message: "❌ Error fetching current plan features.",
          };
        }

        const currentFeatures = plan.features || [];
        const updatedFeatures = [...currentFeatures, feature];

        const { error } = await supabaseAdmin
          .from("subscription_plans")
          .update({
            features: updatedFeatures,
          })
          .eq("id", planId);

        if (error) {
          console.error("Error adding plan feature:", error);
          return {
            success: false,
            message: `❌ Database error: ${error.message}`,
          };
        }

        await logAdminAction(
          userId,
          "plan_feature_add",
          `Added feature "${feature}" to plan`,
          "subscription_plans",
          planId,
        );
        return {
          success: true,
          message: `✅ Feature "${feature}" added successfully!`,
          planId,
        };
      }

      case "plan_remove_feature": {
        const index = parseInt(inputText.trim());
        if (isNaN(index) || index < 1) {
          return {
            success: false,
            message: "❌ Enter the number of the feature to remove.",
          };
        }

        const { data: plan, error: fetchError } = await supabaseAdmin
          .from("subscription_plans")
          .select("features")
          .eq("id", planId)
          .single();

        if (fetchError || !plan) {
          return {
            success: false,
            message: "❌ Error fetching current plan features.",
          };
        }

        const features: string[] = plan.features || [];
        if (index > features.length) {
          return {
            success: false,
            message: "❌ Invalid feature number.",
          };
        }

        const [removed] = features.splice(index - 1, 1);

        const { error } = await supabaseAdmin
          .from("subscription_plans")
          .update({ features })
          .eq("id", planId);

        if (error) {
          console.error("Error removing plan feature:", error);
          return {
            success: false,
            message: `❌ Database error: ${error.message}`,
          };
        }

        await logAdminAction(
          userId,
          "plan_feature_remove",
          `Removed feature "${removed}" from plan`,
          "subscription_plans",
          planId,
        );
        return {
          success: true,
          message: "✅ Feature removed successfully!",
          planId,
        };
      }

      case "plan_replace_features": {
        const features = inputText.split(",")
          .map((f) => f.trim())
          .filter((f) => f.length > 0);
        if (features.length === 0) {
          return {
            success: false,
            message: "❌ Please provide at least one feature.",
          };
        }

        const { error } = await supabaseAdmin
          .from("subscription_plans")
          .update({ features })
          .eq("id", planId);

        if (error) {
          console.error("Error replacing plan features:", error);
          return {
            success: false,
            message: `❌ Database error: ${error.message}`,
          };
        }

        await logAdminAction(
          userId,
          "plan_features_replace",
          `Replaced features: ${features.join(", ")}`,
          "subscription_plans",
          planId,
        );
        return {
          success: true,
          message: "✅ Features replaced successfully!",
          planId,
        };
      }

      case "create_vip_plan": {
        return await processCreatePlanInput(userId, inputText);
      }

      default:
        return {
          success: false,
          message: "❌ Unknown input type. Please start over.",
        };
    }
  } catch (error) {
    console.error("Error in processPlanEditInput:", error);
    return {
      success: false,
      message: "❌ Unexpected error occurred. Please try again.",
    };
  }
}

// Process plan creation input
async function processCreatePlanInput(
  userId: string,
  inputText: string,
): Promise<{ success: boolean; message: string }> {
  try {
    const lines = inputText.split("\n").map((line) => line.trim()).filter(
      (line) => line,
    );
    interface PlanData {
      features?: string[];
      [key: string]: unknown;
    }
    const planData: PlanData = {};

    for (const line of lines) {
      const [key, ...valueParts] = line.split(":");
      const value = valueParts.join(":").trim();

      if (!key || !value) continue;

      const keyLower = key.toLowerCase().trim();

      switch (keyLower) {
        case "name":
          planData.name = value;
          break;
        case "price": {
          const price = parseFloat(value);
          if (isNaN(price) || price <= 0) {
            return {
              success: false,
              message:
                "❌ Invalid price format. Use numbers only (e.g., 49.99)",
            };
          }
          planData.price = price;
          break;
        }
        case "duration":
          if (value.toLowerCase() === "lifetime") {
            planData.is_lifetime = true;
            planData.duration_months = 0;
          } else {
            const duration = parseInt(value);
            if (isNaN(duration) || duration <= 0) {
              return {
                success: false,
                message:
                  "❌ Invalid duration. Use numbers (e.g., 12) or 'lifetime'",
              };
            }
            planData.is_lifetime = false;
            planData.duration_months = duration;
          }
          break;
        case "currency":
          planData.currency = value.toUpperCase();
          break;
        case "features":
          planData.features = value.split(",").map((f) => f.trim()).filter(
            (f) => f,
          );
          break;
      }
    }

    // Validate required fields
    if (!planData.name) {
      return { success: false, message: "❌ Plan name is required" };
    }
    if (!planData.price) {
      return { success: false, message: "❌ Plan price is required" };
    }
    if (!("is_lifetime" in planData)) {
      return { success: false, message: "❌ Plan duration is required" };
    }
    if (!planData.features || planData.features.length === 0) {
      return { success: false, message: "❌ At least one feature is required" };
    }

    // Set defaults
    planData.currency = planData.currency || "USD";

    // Create the plan
    const { data: newPlan, error } = await supabaseAdmin
      .from("subscription_plans")
      .insert(planData)
      .select()
      .single();

    if (error) {
      console.error("Error creating plan:", error);
      return { success: false, message: `❌ Database error: ${error.message}` };
    }

    await logAdminAction(
      userId,
      "plan_create",
      `Created VIP plan: ${planData.name}`,
      "subscription_plans",
      newPlan.id,
    );

    const durationText = planData.is_lifetime
      ? "Lifetime"
      : `${planData.duration_months} months`;
    return {
      success: true,
      message: `✅ *Plan Created Successfully!*\n\n` +
        `**${planData.name}**\n` +
        `💰 ${planData.currency} ${planData.price}\n` +
        `⏰ ${durationText}\n` +
        `✨ ${planData.features.length} features`,
    };
  } catch (error) {
    console.error("Error in processCreatePlanInput:", error);
    return {
      success: false,
      message: "❌ Error creating plan. Please check the format and try again.",
    };
  }
}
export async function deleteVipPackage(
  packageId: string,
  adminId: string,
): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin
      .from("subscription_plans")
      .delete()
      .eq("id", packageId);

    if (!error) {
      await logAdminAction(
        adminId,
        "package_delete",
        `Deleted VIP package: ${packageId}`,
        "subscription_plans",
        packageId,
        {},
        {},
      );
    }

    return !error;
  } catch (error) {
    console.error("Exception in deleteVipPackage:", error);
    return false;
  }
}

// Education package management functions
export async function getEducationPackages(): Promise<
  Record<string, unknown>[]
> {
  if (typeof supabaseAdmin?.from !== "function") {
    return readMockTableRows<Record<string, unknown>>("education_packages") ??
      [];
  }

  return await runListQuery<Record<string, unknown>>(
    supabaseAdmin
      .from<Record<string, unknown>>("education_packages")
      .select("*")
      .eq("is_active", true),
    {
      table: "education_packages",
      orderBy: "price",
      ascending: true,
      errorMessage: "Error fetching education packages:",
    },
  );
}

export async function createEducationPackage(
  packageData: Record<string, unknown>,
  adminId: string,
): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin
      .from("education_packages")
      .insert(packageData);

    if (!error) {
      await logAdminAction(
        adminId,
        "edu_package_create",
        `Created education package: ${packageData.name}`,
        "education_packages",
        undefined,
        {},
        packageData,
      );
    }

    return !error;
  } catch (error) {
    console.error("Exception in createEducationPackage:", error);
    return false;
  }
}

// Promotion management functions
export async function getActivePromotions(): Promise<
  Record<string, unknown>[]
> {
  if (typeof supabaseAdmin?.from !== "function") {
    return readMockTableRows<Record<string, unknown>>("promotions") ?? [];
  }

  return await runListQuery<Record<string, unknown>>(
    supabaseAdmin
      .from<Record<string, unknown>>("promotions")
      .select("*")
      .eq("is_active", true)
      .gte("valid_until", new Date().toISOString()),
    {
      table: "promotions",
      orderBy: "created_at",
      ascending: false,
      errorMessage: "Error fetching promotions:",
    },
  );
}

// Contact link management functions
interface ContactLink {
  display_name: string;
  url: string;
  icon_emoji: string;
}

export async function getContactLinks(): Promise<ContactLink[]> {
  if (typeof supabaseAdmin?.from !== "function") {
    return readMockTableRows<ContactLink>("contact_links") ?? [];
  }

  return await runListQuery<ContactLink>(
    supabaseAdmin
      .from<ContactLink>("contact_links")
      .select("display_name, url, icon_emoji")
      .eq("is_active", true),
    {
      table: "contact_links",
      orderBy: "display_order",
      ascending: true,
      errorMessage: "Error fetching contact links:",
    },
  );
}

export async function createPromotion(
  promoData: Record<string, unknown>,
  adminId: string,
): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin
      .from("promotions")
      .insert(promoData);

    if (!error) {
      await logAdminAction(
        adminId,
        "promo_create",
        `Created promotion: ${promoData.code}`,
        "promotions",
        undefined,
        {},
        promoData,
      );
    }

    return !error;
  } catch (error) {
    console.error("Exception in createPromotion:", error);
    return false;
  }
}

// Admin logging function
export async function logAdminAction(
  adminId: string,
  actionType: string,
  description: string,
  affectedTable?: string,
  affectedRecordId?: string,
  oldValues?: Record<string, unknown>,
  newValues?: Record<string, unknown>,
): Promise<void> {
  try {
    await supabaseAdmin
      .from("admin_logs")
      .insert({
        admin_telegram_id: adminId,
        action_type: actionType,
        action_description: description,
        affected_table: affectedTable,
        affected_record_id: affectedRecordId,
        old_values: oldValues,
        new_values: newValues,
      });
  } catch (error) {
    console.error("Error logging admin action:", error);
  }
}

// User activity functions
export async function updateUserActivity(
  telegramUserId: string,
  activityData: Record<string, unknown> = {},
): Promise<void> {
  try {
    // Update user's last activity
    await supabaseAdmin
      .from("bot_users")
      .upsert({
        telegram_id: telegramUserId,
        follow_up_count: 0, // Reset follow-up count on activity
      }, {
        onConflict: "telegram_id",
      });

    // Update active session
    await supabaseAdmin
      .from("user_sessions")
      .update({
        last_activity: new Date().toISOString(),
        session_data: activityData,
      })
      .eq("telegram_user_id", telegramUserId)
      .eq("is_active", true);

    // Track interaction
    await supabaseAdmin
      .from("user_interactions")
      .insert({
        telegram_user_id: telegramUserId,
        interaction_type: "message",
        interaction_data: activityData,
        created_at: new Date().toISOString(),
      });
  } catch (error) {
    console.error("Error updating user activity:", error);
  }
}

// Utility function to format content with variables
export function formatContent(
  content: string,
  variables: Record<string, string>,
): string {
  let formattedContent = content;

  Object.entries(variables).forEach(([key, value]) => {
    const placeholder = `{${key}}`;
    formattedContent = formattedContent.replace(
      new RegExp(placeholder, "g"),
      value || "",
    );
  });

  return formattedContent;
}

// Receipt helpers
export async function insertReceiptRecord(
  payload: Record<string, unknown>,
): Promise<void> {
  if (!supabaseAdmin) return;
  await supabaseAdmin.from("receipts").insert(payload);
}

export async function markIntentApproved(intentId: string): Promise<void> {
  if (!supabaseAdmin) return;
  await supabaseAdmin
    .from("payment_intents")
    .update({ status: "approved", approved_at: new Date().toISOString() })
    .eq("id", intentId);
}

export async function markIntentManualReview(
  intentId: string,
  reason: string,
): Promise<void> {
  if (!supabaseAdmin) return;
  await supabaseAdmin
    .from("payment_intents")
    .update({ status: "manual_review", manual_review_reason: reason })
    .eq("id", intentId);
}
