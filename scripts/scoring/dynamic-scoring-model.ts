import { readFileSync } from "node:fs";
import { stdin } from "node:process";

export interface IntelligenceBenchmarks {
  mmluPro: number;
  gpqa: number;
  agentBench: number;
  arcChallenge: number;
}

export interface CodingBenchmarks {
  liveCodeBench: number;
  sweBench: number;
  sciCode: number;
}

export interface MathBenchmarks {
  aimeAccuracy: number;
}

export interface ReasoningBenchmarks {
  gpqaLogical: number;
  mmluProLogical: number;
}

export interface SpeedBenchmarks {
  outputTokensPerSecond: number;
  ttftSeconds: number;
}

export interface ContextWindowBenchmarks {
  windowTokens: number;
}

export interface CostBenchmarks {
  inputCostPerMillion: number;
  outputCostPerMillion: number;
}

export interface ModelBenchmarkInput {
  intelligence: IntelligenceBenchmarks;
  coding: CodingBenchmarks;
  math: MathBenchmarks;
  reasoning: ReasoningBenchmarks;
  speed: SpeedBenchmarks;
  context: ContextWindowBenchmarks;
  cost: CostBenchmarks;
}

export interface IntelligenceWeights {
  mmluPro: number;
  gpqa: number;
  agentBench: number;
  arcChallenge: number;
}

export interface CodingWeights {
  liveCodeBench: number;
  sweBench: number;
  sciCode: number;
}

export interface ReasoningWeights {
  gpqaLogical: number;
  mmluProLogical: number;
}

export interface SpeedWeights {
  outputTokensPerSecond: number;
  ttftSeconds: number;
}

export interface OverallWeights {
  intelligence: number;
  coding: number;
  math: number;
  reasoning: number;
  speed: number;
  context: number;
  cost: number;
}

export interface NormalizationRule {
  best: number;
  worst: number;
  higherIsBetter?: boolean;
}

export interface NormalizationSettings {
  intelligence: NormalizationRule;
  coding: NormalizationRule;
  math: NormalizationRule;
  reasoning: NormalizationRule;
  speed: {
    outputTokensPerSecond: NormalizationRule;
    ttftSeconds: NormalizationRule;
  };
  context: NormalizationRule;
  cost: NormalizationRule;
}

export interface DynamicScoringConfig {
  intelligenceWeights?: Partial<IntelligenceWeights>;
  codingWeights?: Partial<CodingWeights>;
  reasoningWeights?: Partial<ReasoningWeights>;
  speedWeights?: Partial<SpeedWeights>;
  overallWeights?: Partial<OverallWeights>;
  normalization?: Partial<NormalizationSettings>;
}

export interface SpeedScoreBreakdown {
  outputTokensPerSecond: number;
  ttftSeconds: number;
  normalizedOutput: number;
  normalizedTtft: number;
  compositeScore: number;
}

export interface NormalizedScores {
  intelligence: number;
  coding: number;
  math: number;
  reasoning: number;
  speed: number;
  context: number;
  cost: number;
}

export interface DynamicScoringSummary {
  intelligenceScore: number;
  codingScore: number;
  mathScore: number;
  reasoningScore: number;
  speed: SpeedScoreBreakdown;
  contextWindowTokens: number;
  totalCostPerMillion: number;
  normalized: NormalizedScores;
  overallScore: number;
}

interface WeightConfig {
  intelligence: IntelligenceWeights;
  coding: CodingWeights;
  reasoning: ReasoningWeights;
  speed: SpeedWeights;
  overall: OverallWeights;
}

const DEFAULT_INTELLIGENCE_WEIGHTS: IntelligenceWeights = {
  mmluPro: 0.4,
  gpqa: 0.3,
  agentBench: 0.2,
  arcChallenge: 0.1,
};

const DEFAULT_CODING_WEIGHTS: CodingWeights = {
  liveCodeBench: 0.5,
  sweBench: 0.3,
  sciCode: 0.2,
};

const DEFAULT_REASONING_WEIGHTS: ReasoningWeights = {
  gpqaLogical: 0.5,
  mmluProLogical: 0.5,
};

const DEFAULT_SPEED_WEIGHTS: SpeedWeights = {
  outputTokensPerSecond: 0.6,
  ttftSeconds: 0.4,
};

const DEFAULT_OVERALL_WEIGHTS: OverallWeights = {
  intelligence: 0.25,
  coding: 0.2,
  math: 0.1,
  reasoning: 0.15,
  speed: 0.15,
  context: 0.1,
  cost: 0.05,
};

const DEFAULT_NORMALIZATION: NormalizationSettings = {
  intelligence: { best: 100, worst: 0, higherIsBetter: true },
  coding: { best: 100, worst: 0, higherIsBetter: true },
  math: { best: 100, worst: 0, higherIsBetter: true },
  reasoning: { best: 100, worst: 0, higherIsBetter: true },
  speed: {
    outputTokensPerSecond: { best: 220, worst: 20, higherIsBetter: true },
    ttftSeconds: { best: 0.2, worst: 6, higherIsBetter: false },
  },
  context: { best: 1_000_000, worst: 4_096, higherIsBetter: true },
  cost: { best: 0.5, worst: 30, higherIsBetter: false },
};

function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) {
    throw new Error("Score inputs must be valid numbers.");
  }
  return Math.min(Math.max(value, min), max);
}

function normalizeWeights<T extends Record<string, number>>(weights: T): T {
  const total = Object.values(weights).reduce((sum, value) => sum + value, 0);
  if (total <= 0) {
    throw new Error("Weights must sum to a positive value.");
  }
  const normalizedEntries = Object.entries(weights).map(([key, value]) => [
    key,
    value / total,
  ]);
  return Object.fromEntries(normalizedEntries) as T;
}

function normalize(value: number, rule: NormalizationRule): number {
  const { best, worst, higherIsBetter = true } = rule;
  if (best === worst) {
    return 1;
  }

  if (higherIsBetter && best <= worst) {
    throw new Error(
      "For metrics where higher is better, 'best' must be greater than 'worst'.",
    );
  }

  if (!higherIsBetter && best >= worst) {
    throw new Error(
      "For metrics where lower is better, 'best' must be less than 'worst'.",
    );
  }

  const bounded = clamp(value, Math.min(best, worst), Math.max(best, worst));
  const span = Math.abs(best - worst);
  if (span === 0) {
    return 1;
  }

  const score = higherIsBetter
    ? (bounded - worst) / span
    : (worst - bounded) / span;
  return clamp(score, 0, 1);
}

function weightedAverage<T extends Record<string, number>>(
  input: T,
  weights: T,
): number {
  return (Object.keys(input) as Array<keyof T>).reduce((sum, key) => {
    const value = input[key];
    const weight = weights[key];
    return sum + value * weight;
  }, 0);
}

function mergeNormalization(
  overrides?: Partial<NormalizationSettings>,
): NormalizationSettings {
  if (!overrides) return DEFAULT_NORMALIZATION;
  return {
    intelligence: {
      ...DEFAULT_NORMALIZATION.intelligence,
      ...overrides.intelligence,
    },
    coding: { ...DEFAULT_NORMALIZATION.coding, ...overrides.coding },
    math: { ...DEFAULT_NORMALIZATION.math, ...overrides.math },
    reasoning: { ...DEFAULT_NORMALIZATION.reasoning, ...overrides.reasoning },
    speed: {
      outputTokensPerSecond: {
        ...DEFAULT_NORMALIZATION.speed.outputTokensPerSecond,
        ...overrides.speed?.outputTokensPerSecond,
      },
      ttftSeconds: {
        ...DEFAULT_NORMALIZATION.speed.ttftSeconds,
        ...overrides.speed?.ttftSeconds,
      },
    },
    context: { ...DEFAULT_NORMALIZATION.context, ...overrides.context },
    cost: { ...DEFAULT_NORMALIZATION.cost, ...overrides.cost },
  };
}

function mergeWeights(config: DynamicScoringConfig): WeightConfig {
  const intelligence = normalizeWeights({
    ...DEFAULT_INTELLIGENCE_WEIGHTS,
    ...config.intelligenceWeights,
  });
  const coding = normalizeWeights({
    ...DEFAULT_CODING_WEIGHTS,
    ...config.codingWeights,
  });
  const reasoning = normalizeWeights({
    ...DEFAULT_REASONING_WEIGHTS,
    ...config.reasoningWeights,
  });
  const speed = normalizeWeights({
    ...DEFAULT_SPEED_WEIGHTS,
    ...config.speedWeights,
  });
  const overall = normalizeWeights({
    ...DEFAULT_OVERALL_WEIGHTS,
    ...config.overallWeights,
  });
  return { intelligence, coding, reasoning, speed, overall };
}

export class DynamicScoringModel {
  private readonly weights: WeightConfig;

  private readonly normalization: NormalizationSettings;

  constructor(config: DynamicScoringConfig = {}) {
    this.weights = mergeWeights(config);
    this.normalization = mergeNormalization(config.normalization);
  }

  evaluate(input: ModelBenchmarkInput): DynamicScoringSummary {
    const intelligenceScore = weightedAverage(
      input.intelligence,
      this.weights.intelligence,
    );
    const codingScore = weightedAverage(
      input.coding,
      this.weights.coding,
    );
    const reasoningScore = weightedAverage(
      input.reasoning,
      this.weights.reasoning,
    );
    const mathScore = input.math.aimeAccuracy;
    const totalCostPerMillion = input.cost.inputCostPerMillion +
      input.cost.outputCostPerMillion;

    const normalizedOutputSpeed = normalize(
      input.speed.outputTokensPerSecond,
      this.normalization.speed.outputTokensPerSecond,
    );
    const normalizedTtft = normalize(
      input.speed.ttftSeconds,
      this.normalization.speed.ttftSeconds,
    );
    const normalizedSpeed = clamp(
      this.weights.speed.outputTokensPerSecond * normalizedOutputSpeed +
        this.weights.speed.ttftSeconds * normalizedTtft,
      0,
      1,
    );

    const normalizedIntelligence = normalize(
      intelligenceScore,
      this.normalization.intelligence,
    );
    const normalizedCoding = normalize(
      codingScore,
      this.normalization.coding,
    );
    const normalizedMath = normalize(mathScore, this.normalization.math);
    const normalizedReasoning = normalize(
      reasoningScore,
      this.normalization.reasoning,
    );
    const normalizedContext = normalize(
      input.context.windowTokens,
      this.normalization.context,
    );
    const normalizedCost = normalize(
      totalCostPerMillion,
      this.normalization.cost,
    );

    const overallScore = clamp(
      (this.weights.overall.intelligence * normalizedIntelligence) +
        (this.weights.overall.coding * normalizedCoding) +
        (this.weights.overall.math * normalizedMath) +
        (this.weights.overall.reasoning * normalizedReasoning) +
        (this.weights.overall.speed * normalizedSpeed) +
        (this.weights.overall.context * normalizedContext) +
        (this.weights.overall.cost * normalizedCost),
      0,
      1,
    ) * 100;

    return {
      intelligenceScore,
      codingScore,
      mathScore,
      reasoningScore,
      speed: {
        outputTokensPerSecond: input.speed.outputTokensPerSecond,
        ttftSeconds: input.speed.ttftSeconds,
        normalizedOutput: normalizedOutputSpeed,
        normalizedTtft,
        compositeScore: normalizedSpeed * 100,
      },
      contextWindowTokens: input.context.windowTokens,
      totalCostPerMillion,
      normalized: {
        intelligence: normalizedIntelligence,
        coding: normalizedCoding,
        math: normalizedMath,
        reasoning: normalizedReasoning,
        speed: normalizedSpeed,
        context: normalizedContext,
        cost: normalizedCost,
      },
      overallScore,
    };
  }
}

function readInput(path?: string): Promise<string> {
  if (path) {
    return Promise.resolve(readFileSync(path, "utf8"));
  }
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stdin.on("data", (chunk) => {
      chunks.push(Buffer.from(chunk));
    });
    stdin.on("end", () => {
      resolve(Buffer.concat(chunks).toString("utf8"));
    });
    stdin.on("error", (error) => reject(error));
  });
}

function parseArgs(argv: string[]): Record<string, string> {
  return argv.reduce<Record<string, string>>((acc, arg) => {
    if (!arg.startsWith("--")) return acc;
    const [key, value] = arg.slice(2).split("=");
    if (key && value) {
      acc[key] = value;
    }
    return acc;
  }, {});
}

if (import.meta.url === `file://${process.argv[1]}`) {
  (async () => {
    const args = parseArgs(process.argv.slice(2));
    const inputPath = args.input ?? args.i;
    const raw = await readInput(inputPath);
    const payload = JSON.parse(raw) as ModelBenchmarkInput;
    const config: DynamicScoringConfig = {};

    if (args.config) {
      const configContent = await readInput(args.config);
      Object.assign(config, JSON.parse(configContent));
    }

    const model = new DynamicScoringModel(config);
    const result = model.evaluate(payload);
    // eslint-disable-next-line no-console -- CLI output
    console.log(JSON.stringify(result, null, 2));
  })().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
