# Dynamic AI Online Learning Template

This template outlines a Supabase-first architecture for continuously ingesting market intelligence, retraining fusion models, and serving unified trading signals across applications.

## 1. Supabase Database Schema

Create the core tables to store news embeddings, algorithmic signals, executed trades, policy events, and treasury balances. The schema assumes the [`pgvector`](https://supabase.com/docs/guides/database/extensions/pgvector) extension is available for semantic search workflows.

```sql
-- Raw Knowledge Ingestion
create table if not exists knowledge_base (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  title text,
  content text not null,
  lang text default 'en',
  created_at timestamptz default now(),
  embedding vector(1536)
);

-- Algo Signals
create table if not exists signals (
  id uuid primary key default gen_random_uuid(),
  symbol text,
  signal text,
  confidence numeric,
  lobe text,
  created_at timestamptz default now()
);

-- Trades (with SL/TP)
create table if not exists trades (
  id uuid primary key default gen_random_uuid(),
  symbol text,
  side text,
  qty numeric,
  price numeric,
  sl numeric,
  tp numeric,
  pnl numeric,
  source text,
  created_at timestamptz default now()
);

-- Policy Events (burn, buyback, tax)
create table if not exists policy_events (
  id uuid primary key default gen_random_uuid(),
  event_type text,
  triggered_by text,
  created_at timestamptz default now()
);

-- Treasury (for DCT)
create table if not exists treasury (
  id uuid primary key default gen_random_uuid(),
  asset text,
  balance numeric,
  updated_at timestamptz default now()
);
```

## 2. Data Collector (Python Bot → Supabase Function)

The collector polls curated RSS feeds, extracts the latest articles, and forwards them to the `news-ingest` edge function. Update `SUPABASE_FN` and `API_KEY` with the deployed function URL and anon key for your project.

```python
import feedparser
import json
import requests

SUPABASE_FN = "https://<PROJECT_REF>.functions.supabase.co/news-ingest"
API_KEY = "<SUPABASE_ANON_KEY>"

feeds = [
    "https://news.google.com/rss/search?q=forex",
    "https://news.google.com/rss/search?q=crypto",
    "https://www.investing.com/rss/news.rss",
]

for url in feeds:
    feed = feedparser.parse(url)
    for entry in feed.entries[:5]:
        payload = {
            "source": entry.get("link"),
            "title": entry.get("title"),
            "content": entry.get("summary"),
            "lang": "en",
        }
        requests.post(
            SUPABASE_FN,
            headers={"apikey": API_KEY, "Content-Type": "application/json"},
            data=json.dumps(payload),
        )
```

## 3. Supabase Edge Function `news-ingest`

Generate embeddings from incoming content, persist them into `knowledge_base`, and return a simple status payload. Supply the OpenAI (or alternate provider) API key through Edge Function environment variables.

```ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { embed } from "https://esm.sh/openai";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

serve(async (req) => {
  try {
    const { source, title, content, lang } = await req.json();

    const embedding = await embed(content);

    await supabase.from("knowledge_base").insert({
      source,
      title,
      content,
      lang,
      embedding,
    });

    return new Response(JSON.stringify({ status: "ok" }), { status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), { status: 500 });
  }
});
```

## 4. Training Workflow (GitHub Actions)

A scheduled workflow retrains the sentiment and fusion models daily, uploads new artifacts to Supabase Storage, and deploys the `fusion` edge function.

```yaml
name: Train DAI Sentiment + Fusion

on:
  schedule:
    - cron: "0 0 * * *"
  workflow_dispatch:

jobs:
  train:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: "3.10"

      - name: Install deps
        run: pip install -r requirements.txt

      - name: Train Sentiment Model
        run: python ml/sentiment_train.py --input knowledge_base --output models/sentiment_v1.pkl

      - name: Train Fusion Model
        run: python ml/fusion_train.py --output models/fusion_v1.pkl

      - name: Upload models to Supabase
        run: supabase storage upload ai-models/ models/ --project-ref ${{ secrets.SUPABASE_PROJECT_ID }}
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}

      - name: Deploy Supabase Functions
        run: supabase functions deploy fusion --project-ref ${{ secrets.SUPABASE_PROJECT_ID }}
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
```

## 5. Fusion Edge Function

The fusion service combines Lorentzian, sentiment, and policy inputs to output a final signal with weighted confidence. Extend this scaffold to incorporate policy event weighting and error handling.

```ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

serve(async (req) => {
  const body = await req.json();
  const { symbol } = body;

  const lor = await supabase.functions.invoke("lorentzian-eval", { body });
  const { data: kb } = await supabase.rpc("get_recent_sentiment", { symbol });

  const lorWeight = 0.5;
  const sentimentWeight = 0.3;

  const lorScore = (lor.data?.signal === "BUY" ? 1 : -1) * (lor.data?.confidence ?? 0) * lorWeight;
  const sentimentScore = (kb?.signal === "BUY" ? 1 : -1) * (kb?.confidence ?? 0) * sentimentWeight;

  const score = lorScore + sentimentScore;
  const finalSignal = score > 0 ? "BUY" : "SELL";

  return new Response(
    JSON.stringify({
      symbol,
      final_signal: finalSignal,
      confidence: Math.abs(score),
    }),
    { status: 200 }
  );
});
```

## 6. Dashboard Integration

Deliver a unified view of signals, trades, policy updates, treasury balances, and latest news to downstream experiences (web app, mini app, or Telegram bot). Example Telegram payload:

```
📊 Dashboard
⚡ Signal: XAUUSD → BUY (Conf 0.82) [Lorentzian+Fusion]
📰 News: "Gold Rises as Dollar Weakens" → Sentiment: BUY
💹 Trade: XAUUSD BUY | Entry 1930 | SL: 1910 | TP: 1970
💰 Treasury: +500 DCT added from Buyback
```

## Key Benefits

- **Online learning** keeps sentiment models fresh by ingesting daily news and embeddings.
- **CI/CD retraining** via GitHub Actions ensures the fusion pipeline evolves automatically.
- **Supabase-first design** centralizes storage, functions, and model artifacts.
- **Unified dashboards** contextualize algorithm outputs with treasury and policy insights for faster decisions.
