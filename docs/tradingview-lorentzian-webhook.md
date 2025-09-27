# TradingView → Lorentzian Webhook Integration

This guide shows how to stream the most recent TradingView candle closes into
Dynamic Capital's `lorentzian-eval` Supabase Edge Function. With this setup,
alerts deliver a rolling window of prices, triggering real-time inference and
signal logging without MetaTrader 5 plugins or manual intervention.

## 1. Configure the TradingView Alert

1. Open the chart and strategy that should power the Lorentzian feed.
2. Add the helper script (see below) to the chart so TradingView exposes the
   **Lorentzian Feed** alert condition.
3. Create or edit an alert, choose the helper script as the condition, and set
   **Webhook URL** as the delivery method.
4. Paste the Supabase Edge Function endpoint that hosts `lorentzian-eval` into
   the **Webhook URL** field.
5. Set the alert to trigger on every candle close so the price window stays
   fresh.

## 2. Build the Alert Payload

TradingView only exposes the active candle's `{{close}}` placeholder inside
alert templates. To stream a rolling window, construct the payload in
Pine Script and pass the serialized JSON string to the alert message. The
Supabase function expects a shape similar to:

```json
{
  "symbol": "BINANCE:BTCUSDT",
  "prices": [
    64253.51,
    64212.40,
    64190.77,
    64105.63,
    64010.18,
    63987.42,
    63901.06,
    63842.55,
    63798.11,
    63755.08
  ]
}
```

## 3. Pine Script Helper

Embed the following script (or adapt it to your strategy) to generate the custom
payload. It collects the latest 10 closes, serializes them into JSON, and keeps
the alert message synced with the webhook contract.

```pinescript
//@version=5
indicator("Lorentzian Algo Feed", overlay=false)

// Collect last 10 closes
closes = array.new_float(0)
for i = 0 to 9
    array.unshift(closes, close[i])

// Build JSON string
json_str = '{"symbol":"' + syminfo.ticker + '","prices":['
for i = 0 to array.size(closes) - 1
    json_str := json_str + str.tostring(array.get(closes, i))
    if i < array.size(closes) - 1
        json_str := json_str + ","
json_str := json_str + "]}"

// Create alert condition and forward JSON to any alerts based on this script
alertcondition(true, title="Lorentzian Feed", message=json_str)

// Optional: push the JSON immediately when run in the strategy tester
if barstate.islast
    alert(message=json_str, freq=alert.freq_once_per_bar_close)
```

## 4. Webhook Execution Flow

Once the alert fires:

1. TradingView sends the JSON payload to the Supabase Edge Function via the
   webhook URL.
2. `lorentzian-eval` downloads the latest model artifact from Supabase Storage
   (e.g., `lorentzian_vX.pkl`).
3. The function scores the price window, returning `BUY`, `SELL`, or `NEUTRAL`
   alongside the confidence value.
4. Results are persisted into the `signals` table, where they become available
   to the Telegram bot and Mini App.

## 5. Benefits

- **Real-time inference** – Decisions land seconds after each candle closes.
- **Webhook-native** – No MetaTrader 5 plugin is required; everything rides on
  HTTPS alerts.
- **Lightweight payloads** – Compact JSON keeps Supabase Edge Function invocations
  fast and cost-effective.
- **CI/CD friendly** – Model updates propagate automatically when new artifacts
  are published to storage.
