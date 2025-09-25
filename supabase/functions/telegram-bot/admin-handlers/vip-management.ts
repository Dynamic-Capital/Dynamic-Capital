// Enhanced VIP Sync Management for Telegram Admin
import { sendMessage, supabaseAdmin } from "./common.ts";
import { logAdminAction } from "../database-utils.ts";

// Handle VIP Sync Management
export async function handleVipSyncManagement(
  chatId: number,
  userId: string,
): Promise<void> {
  const message = `🔄 *VIP Sync Management*

📊 *Real-time Member Sync:*
• Automatically syncs when members join/leave VIP channels
• Updates VIP status in real-time
• Maintains accurate membership records

⚙️ *Manual Sync Options:*
• Full sync all VIP members
• Assign lifetime to current members
• Sync specific user
• View sync status

🎯 *Actions Available:*`;

  const keyboard = {
    inline_keyboard: [
      [
        { text: "🔄 Full Sync Now", callback_data: "vip_full_sync" },
        { text: "🎁 Assign Lifetime", callback_data: "vip_assign_lifetime" },
      ],
      [
        { text: "👤 Sync Single User", callback_data: "vip_sync_single" },
        { text: "📊 View VIP Status", callback_data: "vip_view_status" },
      ],
      [
        {
          text: "⚙️ Configure Channels",
          callback_data: "vip_configure_channels",
        },
        { text: "📈 Sync Logs", callback_data: "vip_sync_logs" },
      ],
      [
        { text: "🔙 Back", callback_data: "manage_table_channel_memberships" },
      ],
    ],
  };

  await sendMessage(chatId, message, keyboard);
}

// Handle Full VIP Sync
export async function handleVipFullSync(
  chatId: number,
  userId: string,
): Promise<void> {
  try {
    await sendMessage(chatId, "🔄 Starting full VIP member sync...");

    // Call the enhanced VIP sync function
    const response = await fetch(
      "https://qeejuomcapbdlhnjqjcc.functions.supabase.co/vip-sync-enhanced",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sync_vip_members" }),
      },
    );

    const result = await response.json();

    if (result.ok) {
      const { synced_members, updated_members, channels_processed } = result;

      await logAdminAction(
        userId,
        "vip_full_sync",
        `Full VIP sync: ${synced_members} checked, ${updated_members} updated across ${channels_processed} channels`,
        "channel_memberships",
      );

      const successMessage = `✅ *Full VIP Sync Completed*

📊 *Results:*
• Members checked: ${synced_members}
• Memberships updated: ${updated_members}  
• Channels processed: ${channels_processed}

🎉 All VIP member statuses are now synchronized!`;

      await sendMessage(chatId, successMessage);
    } else {
      throw new Error(result.error || "Sync failed");
    }
  } catch (error) {
    console.error("VIP full sync error:", error);
    const msg = error instanceof Error ? error.message : String(error);
    await sendMessage(chatId, `❌ VIP sync failed: ${msg}`);
  }
}

// Handle Assign Lifetime to Current Members
export async function handleVipAssignLifetime(
  chatId: number,
  userId: string,
): Promise<void> {
  const confirmMessage = `🎁 *Assign Lifetime Membership*

⚠️ **Confirmation Required**

This action will:
• Find all currently active VIP members
• Grant them lifetime VIP status
• Set their subscriptions to never expire
• Create lifetime plan if needed

📊 This action cannot be undone easily.

Are you sure you want to proceed?`;

  const keyboard = {
    inline_keyboard: [
      [
        {
          text: "✅ Yes, Assign Lifetime",
          callback_data: "vip_assign_lifetime_confirm",
        },
        { text: "❌ Cancel", callback_data: "vip_sync_management" },
      ],
    ],
  };

  await sendMessage(chatId, confirmMessage, keyboard);
}

// Confirm and execute lifetime assignment
export async function handleVipAssignLifetimeConfirm(
  chatId: number,
  userId: string,
): Promise<void> {
  try {
    await sendMessage(
      chatId,
      "🎁 Assigning lifetime memberships to current VIP members...",
    );

    const response = await fetch(
      "https://qeejuomcapbdlhnjqjcc.functions.supabase.co/vip-sync-enhanced",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "assign_lifetime" }),
      },
    );

    const result = await response.json();

    if (result.ok) {
      const { total_members, assigned_count, lifetime_plan_id } = result;

      await logAdminAction(
        userId,
        "vip_assign_lifetime",
        `Assigned lifetime membership to ${assigned_count} out of ${total_members} VIP members`,
        "user_subscriptions",
      );

      const successMessage = `🎉 *Lifetime Assignment Complete*

📊 *Results:*
• Total VIP members found: ${total_members}
• Lifetime memberships assigned: ${assigned_count}
• Lifetime plan ID: ${lifetime_plan_id}

✅ All current VIP members now have lifetime access!`;

      await sendMessage(chatId, successMessage);
    } else {
      throw new Error(result.error || "Assignment failed");
    }
  } catch (error) {
    console.error("VIP lifetime assignment error:", error);
    const msg = error instanceof Error ? error.message : String(error);
    await sendMessage(chatId, `❌ Lifetime assignment failed: ${msg}`);
  }
}

// Handle Single User Sync
export async function handleVipSyncSingle(
  chatId: number,
  userId: string,
): Promise<void> {
  const message = `👤 *Sync Single User*

Please send the Telegram User ID to sync.

Example: \`123456789\`

You can also include "lifetime" to assign lifetime membership:
Example: \`123456789 lifetime\`

Use /cancel to abort.`;

  await sendMessage(chatId, message);
  // Note: The actual processing would be handled by the main bot message handler
}

// Process single user sync from text input
export async function processVipSyncSingle(
  chatId: number,
  userId: string,
  input: string,
): Promise<void> {
  try {
    const parts = input.trim().split(" ");
    const targetUserId = parts[0];
    const assignLifetime = parts.includes("lifetime");

    if (!targetUserId || !/^\d+$/.test(targetUserId)) {
      await sendMessage(
        chatId,
        "❌ Invalid user ID. Please provide a numeric Telegram User ID.",
      );
      return;
    }

    await sendMessage(
      chatId,
      `🔄 Syncing user ${targetUserId}${
        assignLifetime ? " with lifetime assignment" : ""
      }...`,
    );

    const response = await fetch(
      "https://qeejuomcapbdlhnjqjcc.functions.supabase.co/vip-sync-enhanced",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "sync_single_user",
          telegram_user_id: targetUserId,
          assign_lifetime: assignLifetime,
        }),
      },
    );

    const result = await response.json();

    if (result.ok) {
      const { user_id, is_vip, channels, lifetime_assigned } = result;

      await logAdminAction(
        userId,
        "vip_sync_single",
        `Synced user ${user_id}: VIP=${is_vip}, Lifetime=${
          lifetime_assigned || false
        }`,
        "channel_memberships",
      );

      let message = `✅ *User Sync Complete*

👤 User ID: ${user_id}
🎯 VIP Status: ${is_vip ? "✅ VIP" : "❌ Not VIP"}
${lifetime_assigned ? "🎁 Lifetime membership assigned!" : ""}

📊 *Channel Status:*`;

      channels.forEach((channel: any) => {
        const status = channel.is_active ? "✅" : "❌";
        message += `\n• ${channel.channel_id}: ${status} ${
          channel.status || "unknown"
        }`;
      });

      await sendMessage(chatId, message);
    } else {
      throw new Error(result.error || "User sync failed");
    }
  } catch (error) {
    console.error("Single user sync error:", error);
    const msg = error instanceof Error ? error.message : String(error);
    await sendMessage(chatId, `❌ User sync failed: ${msg}`);
  }
}

// View VIP Status
export async function handleVipViewStatus(
  chatId: number,
  userId: string,
): Promise<void> {
  try {
    const response = await fetch(
      "https://qeejuomcapbdlhnjqjcc.functions.supabase.co/vip-sync-enhanced",
      {
        method: "GET",
      },
    );

    const result = await response.json();

    if (result.ok) {
      const { total_vip_members, members } = result;

      let message = `📊 *VIP Members Status*

👥 Total Active VIP Members: ${total_vip_members}

🔝 *Recent VIP Members:*`;

      const displayMembers = members.slice(0, 10); // Show first 10

      displayMembers.forEach((member: any, index: number) => {
        const userInfo = member.user_info;
        const name = userInfo?.first_name || userInfo?.username || "Unknown";
        const vipStatus = userInfo?.is_vip ? "✅" : "❌";
        const channelsCount = member.channels.length;

        message += `\n${
          index + 1
        }. ${vipStatus} ${name} (${member.telegram_user_id})`;
        message += `\n   📺 Active in ${channelsCount} channel(s)`;
      });

      if (total_vip_members > 10) {
        message += `\n\n... and ${total_vip_members - 10} more members`;
      }

      const keyboard = {
        inline_keyboard: [
          [
            { text: "🔄 Refresh", callback_data: "vip_view_status" },
            { text: "📊 Export All", callback_data: "vip_export_status" },
          ],
          [
            { text: "🔙 Back", callback_data: "vip_sync_management" },
          ],
        ],
      };

      await sendMessage(chatId, message, keyboard);
    } else {
      throw new Error(result.error || "Failed to fetch VIP status");
    }
  } catch (error) {
    console.error("VIP status view error:", error);
    const msg = error instanceof Error ? error.message : String(error);
    await sendMessage(chatId, `❌ Failed to fetch VIP status: ${msg}`);
  }
}

// Configure VIP Channels
export async function handleVipConfigureChannels(
  chatId: number,
  userId: string,
): Promise<void> {
  try {
    const { data: settings, error } = await supabaseAdmin
      .from("bot_settings")
      .select("setting_value")
      .eq("setting_key", "vip_channels")
      .eq("is_active", true)
      .maybeSingle();

    let currentChannels = [];
    if (settings?.setting_value) {
      try {
        currentChannels = JSON.parse(settings.setting_value);
      } catch {
        currentChannels = [];
      }
    }

    const message = `⚙️ *VIP Channels Configuration*

📺 *Current VIP Channels:*
${
      currentChannels.length > 0
        ? currentChannels.map((ch: string, i: number) => `${i + 1}. ${ch}`)
          .join("\n")
        : "No VIP channels configured"
    }

To add a channel, send: \`add_channel @channelname\`
To remove a channel, send: \`remove_channel @channelname\`

Use /cancel to abort.`;

    await sendMessage(chatId, message);
  } catch (error) {
    console.error("VIP configure channels error:", error);
    const msg = error instanceof Error ? error.message : String(error);
    await sendMessage(
      chatId,
      `❌ Error fetching channel configuration: ${msg}`,
    );
  }
}
