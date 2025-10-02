# Bot Content Keys

The Telegram bot reads rich text snippets from the `bot_content` table. When a
key is missing or the database is offline, the bot falls back to the default
messages below. Update these values in Supabase to customize the experience
without redeploying code.

## Default fallback messages

### `welcome_message`

```
🏁 Welcome to Dynamic Capital!

📊 Institutional-grade trade intelligence on demand
⚡ Live signals with human + automation oversight
🎓 Progression tracks to scale from first trade to managed capital

Use the menu or try commands like /packages, /education, /promo, /dashboard, or /support to get started.
```

### `welcome_back_message`

```
👋 Welcome back to Dynamic Capital!

Here's what's live right now:
• 📈 Alpha Signals – intraday & swing setups with risk levels
• 🧠 Mentorship Tracks – tighten discipline and execution
• 🤖 Automation Access – connect bots once your review clears

Quick commands:
• /dashboard — view your status & receipts
• /packages — compare VIP routes
• /education — unlock training tracks
• /support — reach the concierge desk

Let us know if you need anything.
```

### `about_us`

```
🏢 About Dynamic Capital

Dynamic Capital pairs senior analysts with automation so every member receives:
• Institutional-grade trade ideas with transparent performance
• Structured mentorship paths that level up risk governance
• Concierge support that keeps you accountable to the playbook

We operate across timezones to keep members synced with the desk.
```

### `support_message`

```
🛟 *Need Help?*

Our support team is here for you!

📧 Support: support@dynamiccapital.ton
💬 Telegram: @DynamicCapital_Support
📣 Marketing: marketing@dynamiccapital.ton
🕐 Support Hours: 24/7

We typically respond within 2-4 hours.
```

### `terms_conditions`

```
📋 Terms & Policies

By using Dynamic Capital you acknowledge:
• Trading involves risk; results are never guaranteed
• Signals and automation are educational guidance only
• Access is personal and monitored for compliance
• Refunds follow the onboarding guarantee outlined in your plan

Full terms: https://dynamic.capital/terms
```

### `help_message`

```
❓ Bot Commands & Shortcuts

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

Need a human? Message @DynamicCapital_Support.
```

### `faq_general`

```
❓ Frequently Asked Questions

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

Still stuck? Reach out via /support.
```

### `vip_benefits`

```
💎 VIP Membership Benefits

🚀 Real-time signal desk with analyst commentary
📊 Performance dashboards and accountability reviews
🧠 Mentorship sprints tailored to your trading tier
🤖 Automation hooks once your risk review clears
🛎️ Concierge support around the clock
🎁 Members-only promotions and capital unlocks
```

### `payment_instructions`

```
💳 Payment Instructions

We currently accept:
🏦 Bank transfer through our vetted partners
🪙 USDT (TRC20) sent to the treasury address

After payment:
1. Capture the receipt or transaction hash.
2. Upload it here so the desk can verify ownership.
3. Our team confirms and activates your access within 24 hours (often sooner).

Need help with payment routing? Use /support.
```

### `ask_usage`

```
Please send a question, e.g. /ask How do I size positions?
```

### `ask_no_answer`

```
I couldn't find anything helpful. Try rephrasing or ask /support.
```

### `ask_failed`

```
The coaching assistant is unavailable right now. Please try again shortly.
```

### `service_unavailable`

```
Service temporarily unavailable. Please try again soon.
```

### `shouldibuy_usage`

```
Please send a symbol, e.g. /shouldibuy XAUUSD.
```

### `shouldibuy_no_analysis`

```
No analysis is available yet. Try again soon or contact /support.
```

### `shouldibuy_failed`

```
The analysis desk is offline right now. Please try again shortly.
```
