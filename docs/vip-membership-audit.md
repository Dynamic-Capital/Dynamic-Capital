# Audit: Telegram VIP Membership Workflow

## Scope

This review verifies the prior summary describing how Dynamic Capital checks
Telegram channel membership, records it, and recomputes VIP status.

## Findings

- **Channel list resolution** – `getVipChannels` first reads the `VIP_CHANNELS`
  environment variable and otherwise queries `bot_settings` for the
  `vip_channels` entry, which matches the summary’s reference to a configurable
  channel list.
- **Membership checks** – `checkUserAcrossChannels` iterates over each
  configured channel and calls `getChatMemberStatus`, which invokes Telegram’s
  `getChatMember` API endpoint, confirming the summary’s description of querying
  Telegram for membership status.
- **Persistence & VIP recompute** – `upsertMemberships` writes the per-channel
  membership flags into the `channel_memberships` table and `recomputeVipFlag`
  combines channel membership with subscription data before updating
  `bot_users.is_vip` and `subscription_expires_at`, aligning with the prior
  explanation.
- **Webhook-driven updates** – `handleMembershipUpdate` responds to
  `chat_member` and `my_chat_member` webhook updates for VIP channels by
  upserting the membership row, rerunning `recomputeVipFlag`, and logging the
  action, which is consistent with the summary’s claim about immediate
  join/leave handling.
- **Manual resync** – The `vip-sync` edge function exposes `/one`, `/batch`, and
  `/all` routes that call `recomputeVipForUser` and emit admin log entries,
  substantiating the described manual resync capability.

## Conclusion

All reviewed statements from the earlier summary are accurate with respect to
the current codebase.
