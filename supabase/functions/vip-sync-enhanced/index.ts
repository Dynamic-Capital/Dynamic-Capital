import { createClient } from "../_shared/client.ts";
import { json, ok, oops } from "../_shared/http.ts";
import {
  getChatMemberStatus,
  getVipChannels,
} from "../_shared/telegram_membership.ts";
import { getEnv } from "../_shared/env.ts";
import { registerHandler } from "../_shared/serve.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

export const handler = registerHandler(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient();
    const botToken = getEnv("TELEGRAM_BOT_TOKEN");

    if (req.method === "POST") {
      const { action, telegram_user_id, assign_lifetime } = await req.json();

      switch (action) {
        case "sync_vip_members":
          return await syncVipMembers(supabase, botToken);

        case "assign_lifetime":
          return await assignLifetimeToCurrentMembers(supabase, botToken);

        case "sync_single_user":
          if (!telegram_user_id) {
            return json({ ok: false, error: "telegram_user_id required" }, 400);
          }
          return await syncSingleUser(
            supabase,
            botToken,
            telegram_user_id,
            assign_lifetime,
          );

        default:
          return json({ ok: false, error: "Invalid action" }, 400);
      }
    }

    if (req.method === "GET") {
      return await getVipMembersStatus(supabase);
    }

    return json({ ok: false, error: "Method not allowed" }, 405);
  } catch (error) {
    console.error("VIP Sync error:", error);
    return oops("Internal server error", error.message);
  }
});

async function syncVipMembers(supabase: any, botToken: string) {
  console.log("🔄 Starting VIP members sync...");

  try {
    const channels = await getVipChannels(supabase);
    if (!channels.length) {
      return json({ ok: false, error: "No VIP channels configured" }, 400);
    }

    console.log(`📡 Found ${channels.length} VIP channels:`, channels);

    let totalSynced = 0;
    let totalUpdated = 0;
    const results = [];

    for (const channelId of channels) {
      try {
        console.log(`🔍 Syncing channel: ${channelId}`);

        // Get all current members from channel_memberships
        const { data: existingMembers, error: membersError } = await supabase
          .from("channel_memberships")
          .select("telegram_user_id, is_active")
          .eq("channel_id", channelId);

        if (membersError) {
          console.error(
            `❌ Error fetching members for ${channelId}:`,
            membersError,
          );
          continue;
        }

        console.log(
          `👥 Found ${
            existingMembers?.length || 0
          } existing members in ${channelId}`,
        );

        let channelSynced = 0;
        let channelUpdated = 0;

        // Check each existing member's current status
        for (const member of existingMembers || []) {
          try {
            const currentStatus = await getChatMemberStatus(
              botToken,
              channelId,
              member.telegram_user_id,
            );
            const isCurrentlyActive = currentStatus &&
              ["member", "administrator", "creator"].includes(currentStatus);

            if (member.is_active !== isCurrentlyActive) {
              // Update member status
              const { error: updateError } = await supabase
                .from("channel_memberships")
                .update({
                  is_active: isCurrentlyActive,
                  updated_at: new Date().toISOString(),
                })
                .eq("telegram_user_id", member.telegram_user_id)
                .eq("channel_id", channelId);

              if (!updateError) {
                channelUpdated++;
                console.log(
                  `✅ Updated ${member.telegram_user_id}: ${member.is_active} → ${isCurrentlyActive}`,
                );

                // Recompute VIP status for this user
                await recomputeUserVipStatus(supabase, member.telegram_user_id);
              } else {
                console.error(
                  `❌ Failed to update ${member.telegram_user_id}:`,
                  updateError,
                );
              }
            }

            channelSynced++;

            // Small delay to avoid rate limiting
            await new Promise((resolve) => setTimeout(resolve, 100));
          } catch (error) {
            console.error(
              `❌ Error checking member ${member.telegram_user_id}:`,
              error,
            );
          }
        }

        results.push({
          channel_id: channelId,
          members_checked: channelSynced,
          members_updated: channelUpdated,
        });

        totalSynced += channelSynced;
        totalUpdated += channelUpdated;

        console.log(
          `✅ Channel ${channelId}: ${channelSynced} checked, ${channelUpdated} updated`,
        );
      } catch (error) {
        console.error(`❌ Error syncing channel ${channelId}:`, error);
        results.push({
          channel_id: channelId,
          error: error.message,
        });
      }
    }

    // Log the sync operation
    await supabase.from("admin_logs").insert({
      action_type: "vip_bulk_sync",
      action_description:
        `Synced ${totalSynced} members across ${channels.length} channels. Updated ${totalUpdated} memberships.`,
      affected_table: "channel_memberships",
    });

    console.log(
      `🎉 VIP sync completed: ${totalSynced} checked, ${totalUpdated} updated`,
    );

    return ok({
      synced_members: totalSynced,
      updated_members: totalUpdated,
      channels_processed: channels.length,
      results,
    });
  } catch (error) {
    console.error("❌ VIP sync failed:", error);
    return oops("VIP sync failed", error.message);
  }
}

async function assignLifetimeToCurrentMembers(supabase: any, botToken: string) {
  console.log("🎁 Starting lifetime membership assignment...");

  try {
    // Get all currently active VIP members
    const { data: activeMembers, error: membersError } = await supabase
      .from("channel_memberships")
      .select("telegram_user_id")
      .eq("is_active", true);

    if (membersError) {
      console.error("❌ Error fetching active members:", membersError);
      return oops("Failed to fetch active members", membersError.message);
    }

    if (!activeMembers?.length) {
      console.log("ℹ️ No active VIP members found");
      return ok({ message: "No active VIP members found", assigned_count: 0 });
    }

    console.log(`👥 Found ${activeMembers.length} active VIP members`);

    let assignedCount = 0;
    const results = [];

    // Get a default lifetime plan (or create one)
    const { data: lifetimePlan, error: planError } = await supabase
      .from("subscription_plans")
      .select("id, name, price")
      .eq("is_lifetime", true)
      .eq("name", "VIP Lifetime")
      .maybeSingle();

    if (!lifetimePlan) {
      console.log("🆕 Creating lifetime plan...");
      const { data: newPlan, error: createError } = await supabase
        .from("subscription_plans")
        .insert({
          name: "VIP Lifetime",
          price: 0,
          currency: "USD",
          duration_months: 999,
          is_lifetime: true,
          features: [
            "Lifetime VIP Access",
            "All Premium Features",
            "Priority Support",
          ],
        })
        .select()
        .single();

      if (createError) {
        console.error("❌ Failed to create lifetime plan:", createError);
        return oops("Failed to create lifetime plan", createError.message);
      }

      lifetimePlan = newPlan;
      console.log("✅ Created lifetime plan:", lifetimePlan.id);
    }

    // Process each active member
    for (const member of activeMembers) {
      try {
        // Check if user already has an active subscription
        const { data: existingSub } = await supabase
          .from("user_subscriptions")
          .select("id, is_active, subscription_end_date")
          .eq("telegram_user_id", member.telegram_user_id)
          .eq("is_active", true)
          .maybeSingle();

        if (existingSub) {
          // Update existing subscription to lifetime
          const { error: updateError } = await supabase
            .from("user_subscriptions")
            .update({
              plan_id: lifetimePlan.id,
              subscription_end_date: null, // Null = lifetime
              payment_status: "completed",
              updated_at: new Date().toISOString(),
            })
            .eq("id", existingSub.id);

          if (updateError) {
            console.error(
              `❌ Failed to update subscription for ${member.telegram_user_id}:`,
              updateError,
            );
            results.push({
              telegram_user_id: member.telegram_user_id,
              status: "error",
              error: updateError.message,
            });
          } else {
            assignedCount++;
            console.log(
              `✅ Updated existing subscription for ${member.telegram_user_id}`,
            );
            results.push({
              telegram_user_id: member.telegram_user_id,
              status: "updated",
            });
          }
        } else {
          // Create new lifetime subscription
          const { error: insertError } = await supabase
            .from("user_subscriptions")
            .insert({
              telegram_user_id: member.telegram_user_id,
              plan_id: lifetimePlan.id,
              subscription_start_date: new Date().toISOString(),
              subscription_end_date: null, // Null = lifetime
              is_active: true,
              payment_status: "completed",
              payment_method: "lifetime_grant",
            });

          if (insertError) {
            console.error(
              `❌ Failed to create subscription for ${member.telegram_user_id}:`,
              insertError,
            );
            results.push({
              telegram_user_id: member.telegram_user_id,
              status: "error",
              error: insertError.message,
            });
          } else {
            assignedCount++;
            console.log(
              `✅ Created lifetime subscription for ${member.telegram_user_id}`,
            );
            results.push({
              telegram_user_id: member.telegram_user_id,
              status: "created",
            });
          }
        }

        // Update bot_users VIP status
        await supabase
          .from("bot_users")
          .upsert({
            telegram_id: member.telegram_user_id,
            is_vip: true,
            subscription_expires_at: null,
            updated_at: new Date().toISOString(),
          }, { onConflict: "telegram_id" });
      } catch (error) {
        console.error(
          `❌ Error processing member ${member.telegram_user_id}:`,
          error,
        );
        results.push({
          telegram_user_id: member.telegram_user_id,
          status: "error",
          error: error.message,
        });
      }
    }

    // Log the assignment operation
    await supabase.from("admin_logs").insert({
      action_type: "lifetime_assignment",
      action_description:
        `Assigned lifetime membership to ${assignedCount} current VIP members`,
      affected_table: "user_subscriptions",
    });

    console.log(
      `🎉 Lifetime assignment completed: ${assignedCount} members assigned`,
    );

    return ok({
      total_members: activeMembers.length,
      assigned_count: assignedCount,
      lifetime_plan_id: lifetimePlan.id,
      results,
    });
  } catch (error) {
    console.error("❌ Lifetime assignment failed:", error);
    return oops("Lifetime assignment failed", error.message);
  }
}

async function syncSingleUser(
  supabase: any,
  botToken: string,
  telegramUserId: string,
  assignLifetime = false,
) {
  console.log(`🔄 Syncing single user: ${telegramUserId}`);

  try {
    const channels = await getVipChannels(supabase);
    const results = [];
    let isVipInAnyChannel = false;

    for (const channelId of channels) {
      const status = await getChatMemberStatus(
        botToken,
        channelId,
        telegramUserId,
      );
      const isActive = status &&
        ["member", "administrator", "creator"].includes(status);

      if (isActive) {
        isVipInAnyChannel = true;
      }

      // Update or insert membership record
      await supabase
        .from("channel_memberships")
        .upsert({
          telegram_user_id: telegramUserId,
          channel_id: channelId,
          is_active: isActive,
          updated_at: new Date().toISOString(),
        }, { onConflict: "telegram_user_id,channel_id" });

      results.push({ channel_id: channelId, status, is_active: isActive });
    }

    // Update VIP status
    await recomputeUserVipStatus(supabase, telegramUserId);

    // Assign lifetime if requested and user is VIP
    if (assignLifetime && isVipInAnyChannel) {
      const lifetimeResult = await assignLifetimeToCurrentMembers(
        supabase,
        botToken,
      );
      return ok({
        user_id: telegramUserId,
        is_vip: isVipInAnyChannel,
        channels: results,
        lifetime_assigned: true,
        lifetime_result: lifetimeResult,
      });
    }

    return ok({
      user_id: telegramUserId,
      is_vip: isVipInAnyChannel,
      channels: results,
    });
  } catch (error) {
    console.error(`❌ Error syncing user ${telegramUserId}:`, error);
    return oops("User sync failed", error.message);
  }
}

async function getVipMembersStatus(supabase: any) {
  try {
    const { data: members, error } = await supabase
      .from("channel_memberships")
      .select(`
        telegram_user_id,
        channel_id,
        is_active,
        updated_at,
        bot_users!inner(telegram_id, first_name, username, is_vip)
      `)
      .eq("is_active", true);

    if (error) {
      return oops("Failed to fetch VIP members", error.message);
    }

    const grouped = members?.reduce((acc: any, member: any) => {
      const userId = member.telegram_user_id;
      if (!acc[userId]) {
        acc[userId] = {
          telegram_user_id: userId,
          user_info: member.bot_users,
          channels: [],
        };
      }
      acc[userId].channels.push({
        channel_id: member.channel_id,
        is_active: member.is_active,
        updated_at: member.updated_at,
      });
      return acc;
    }, {});

    return ok({
      total_vip_members: Object.keys(grouped || {}).length,
      members: Object.values(grouped || {}),
    });
  } catch (error) {
    console.error("❌ Error fetching VIP status:", error);
    return oops("Failed to fetch VIP status", error.message);
  }
}

async function recomputeUserVipStatus(supabase: any, telegramUserId: string) {
  try {
    // Check if user has any active channel memberships
    const { data: memberships } = await supabase
      .from("channel_memberships")
      .select("is_active")
      .eq("telegram_user_id", telegramUserId)
      .eq("is_active", true);

    const isVip = (memberships?.length || 0) > 0;

    // Update bot_users table
    await supabase
      .from("bot_users")
      .upsert({
        telegram_id: telegramUserId,
        is_vip: isVip,
        updated_at: new Date().toISOString(),
      }, { onConflict: "telegram_id" });

    console.log(`✅ Updated VIP status for ${telegramUserId}: ${isVip}`);
    return isVip;
  } catch (error) {
    console.error(
      `❌ Error recomputing VIP status for ${telegramUserId}:`,
      error,
    );
    return false;
  }
}

export default handler;
