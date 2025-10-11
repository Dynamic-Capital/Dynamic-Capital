# Emergency Fixes - Telegram Bot & TON Site

## ✅ Completed Actions

### 1. Database Security Fixes ✅ COMPLETED

- ✅ Created `tx_logs` table with RLS policies for audit trail
- ✅ Secured `education_enrollments` table (GDPR compliance)
- ✅ Secured `user_sessions` table (prevents unauthorized access)
- ✅ Fixed build error in `lorentzian-eval` function
- ✅ **NEW:** Moved all extensions to dedicated `extensions` schema
- ✅ **NEW:** Tightened anonymous access on 42 tables
- ✅ **NEW:** Added performance indexes on security-critical columns
- ✅ **NEW:** Created security helper functions to prevent RLS recursion
- ✅ **NEW:** Enabled comprehensive audit logging

**See:** `docs/SECURITY_HARDENING.md` for complete details

### 2. Webhook Helper Function

- ✅ Created `/functions/v1/fix-telegram-webhook` edge function
- This function automates webhook setup with correct secret

## 🔧 Manual Steps Required

### Fix Telegram Bot Webhook (5 minutes)

**Option A: Use the Helper Function**

```bash
curl -X POST "https://qeejuomcapbdlhnjqjcc.supabase.co/functions/v1/fix-telegram-webhook"
```

**Option B: Manual Setup**

1. Get the webhook secret:

```sql
SELECT setting_value FROM bot_settings 
WHERE setting_key = 'TELEGRAM_WEBHOOK_SECRET';
```

2. Set the webhook:

```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
  -d "url=https://qeejuomcapbdlhnjqjcc.supabase.co/functions/v1/telegram-bot" \
  -d "secret_token=<SECRET_FROM_STEP_1>" \
  -d 'allowed_updates=["message","callback_query","inline_query","chat_member","my_chat_member"]'
```

3. Test:

```bash
# Send a message to your bot in Telegram
# Check logs: https://supabase.com/dashboard/project/qeejuomcapbdlhnjqjcc/functions/telegram-bot/logs
```

**Expected Result:** Bot responds to messages within 2 seconds

---

### Restore TON Site (15 minutes)

**Prerequisites:**

- DigitalOcean account with access to `dynamic-capital-qazf2`
- Git push access OR `doctl` CLI configured

**Steps:**

1. **Build the TON Site bundle:**

```bash
cd apps/web
npm install
npm run build
```

2. **Verify build output:**

```bash
# Check that /ton-site routes are included
ls -la .next/standalone/apps/web/app/ton-site/
```

3. **Deploy to DigitalOcean:**

**Via Dashboard:**

- Go to DigitalOcean Apps → dynamic-capital-qazf2
- Click "Deploy" (triggers rebuild from latest Git commit)
- Wait for deployment to complete (~5 minutes)

**Via Git Push:**

```bash
git add .
git commit -m "Restore TON Site bundle"
git push origin main
# DigitalOcean auto-deploys if configured
```

**Via doctl CLI:**

```bash
doctl apps create-deployment <APP_ID>
```

4. **Verify deployment:**

```bash
# Test origin (serves apps/web/public/ton-static)
curl -I https://dynamic-capital-qazf2.ondigitalocean.app/dynamiccapital.ton
# Expected: HTTP/1.1 200 OK once the DigitalOcean deployment completes

# Test public TON Foundation gateway
curl -I https://ton.site/dynamiccapital.ton
# Expected: HTTP/2 200

# Optional: verify the Lovable proxy mirrors the refreshed bundle
curl -I https://ton-gateway.dynamic-capital.lovable.app/dynamiccapital.ton
```

5. **Update DNS status:**

```bash
# Update dns/dynamiccapital.ton.json
# Set ton_site.verification.https.status to "ok"
# Set checked_at to current timestamp
```

**Expected Result:** `tonsite://dynamiccapital.ton` accessible via TON Browser

---

## 🔍 Verification Commands

### Check Telegram Bot Health

```bash
# Get webhook info
curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo"

# Look for:
# - "url": "https://qeejuomcapbdlhnjqjcc.supabase.co/functions/v1/telegram-bot"
# - "pending_update_count": 0 (or low number)
# - "last_error_message": null
```

### Check TON Site Health

```bash
# Check active and legacy endpoints
for url in \
  "https://dynamic-capital-qazf2.ondigitalocean.app/dynamiccapital.ton" \
  "https://ton.site/dynamiccapital.ton" \
  "https://dynamic-capital-qazf2.ondigitalocean.app/dynamiccapital.ton" \
  "https://ton-gateway.dynamic-capital.lovable.app/dynamiccapital.ton"
do
  echo "Testing: $url"
  curl -I "$url" | head -n 1
done
```

---

## 📊 Success Criteria

- [x] Database security policies applied
- [x] Build error fixed
- [x] Webhook helper function created
- [ ] Telegram bot responds to messages (requires manual webhook setup)
- [x] TON Site returns HTTP 200 on all gateways (verified after the 2025-10-11
      redeploy)

---

## 🚨 Troubleshooting

### Telegram Bot Still Returns 401

**Cause:** Secret mismatch\
**Fix:** Verify secret in `bot_settings` table matches what you set in Telegram

### TON Site Returns 404

**Cause:** Bundle not deployed or routes missing\
**Fix:** Rebuild with `npm run build` and redeploy

### TON Site Returns 503

**Cause:** Origin server down\
**Fix:** Check DigitalOcean App Platform status

---

## 📞 Next Steps

1. Run the webhook helper function
2. Record the TON Site redeploy in Supabase `tx_logs`
3. Monitor both services for any regression
4. Escalate if automated probes report new errors

## 🔗 Useful Links

- [Telegram Bot Logs](https://supabase.com/dashboard/project/qeejuomcapbdlhnjqjcc/functions/telegram-bot/logs)
- [Supabase Database](https://supabase.com/dashboard/project/qeejuomcapbdlhnjqjcc/editor)
- [DigitalOcean Apps](https://cloud.digitalocean.com/apps)
