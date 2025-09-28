# Model Scoring Overview

This document summarizes how key evaluation metrics are derived across general
reasoning, coding, math, latency, context capacity, and cost.

## 🧠 Intelligence Score (General Reasoning)

- **Basis:** Weighted average across tasks in MMLU-Pro, GPQA, AgentBench, and
  ARC-Challenge.
- **Formula:** \\ \[\text{Intelligence Score} = 0.4 \times \text{MMLU-Pro} + 0.3
  \times \text{GPQA} + 0.2 \times \text{AgentBench} + 0.1 \times \text{ARC}\]

## 💻 Coding Score

- **Basis:** Composite score from LiveCodeBench, SWE-bench, and SciCode.
- **Formula:** \\ \[\text{Coding Score} = 0.5 \times \text{LiveCodeBench} + 0.3
  \times \text{SWE-bench} + 0.2 \times \text{SciCode}\]

## 🧮 Math & Reasoning

- **Math Score:** Direct AIME-style accuracy percentage.
- **Reasoning Score:** Average of GPQA and MMLU-Pro logical reasoning subsets.

## 🚀 Speed & Latency

- **Output Speed:** Measured in tokens per second (t/s) during standard prompt
  generation.
- **TTFT (Time to First Token):** Seconds from prompt submission to first token
  output.

## 📏 Context Window

- **Definition:** Reported directly from model documentation or API
  specifications; no additional calculations required.

## 💸 Cost

- **Basis:** Provider pricing per 1M tokens, separated into input and output
  costs.
- **Formula:** \\ \[\text{Total Cost} = \text{Input Cost} + \text{Output Cost}\]

## ⚙️ Dynamic Scoring Model

The weighted formulas above are implemented in
`scripts/scoring/dynamic-scoring-model.ts`. The utility accepts benchmark
metrics in JSON format, applies the default weights, and produces normalized
scores plus an overall composite.

### Example input payload

```json
{
  "intelligence": {
    "mmluPro": 64.2,
    "gpqa": 72.1,
    "agentBench": 58.3,
    "arcChallenge": 65.4
  },
  "coding": {
    "liveCodeBench": 68.7,
    "sweBench": 61.5,
    "sciCode": 74.2
  },
  "math": {
    "aimeAccuracy": 47.0
  },
  "reasoning": {
    "gpqaLogical": 70.5,
    "mmluProLogical": 66.0
  },
  "speed": {
    "outputTokensPerSecond": 180,
    "ttftSeconds": 0.6
  },
  "context": {
    "windowTokens": 262144
  },
  "cost": {
    "inputCostPerMillion": 1.5,
    "outputCostPerMillion": 2.0
  }
}
```

Run the scorer with `tsx` (or another Node-based runner) to compute the
composite:

```bash
tsx scripts/scoring/dynamic-scoring-model.ts --input=benchmarks.json
```

Optional overrides for weightings or normalization ranges can be provided via a
configuration file:

```bash
tsx scripts/scoring/dynamic-scoring-model.ts --input=benchmarks.json --config=scoring-config.json
```

When `--config` is supplied, the JSON file may include partial overrides for
`intelligenceWeights`, `codingWeights`, `reasoningWeights`, `speedWeights`,
`overallWeights`, and `normalization`.
