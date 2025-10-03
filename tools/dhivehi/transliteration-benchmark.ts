import transliterationDataset from "./data/transliteration-pairs.json" assert {
  type: "json",
};
import {
  scoreTransliterationPair,
  TransliterationDiff,
} from "./transliteration.ts";

export interface TransliterationSample {
  latin: string;
  thaana: string;
}

export interface TransliterationBenchmarkOptions {
  /**
   * Optional limit to evaluate only the first ``limit`` samples.
   */
  limit?: number;
}

export interface TransliterationBenchmarkSummary {
  total: number;
  exactMatches: number;
  accuracy: number;
  averageScore: number;
  results: TransliterationDiff[];
}

const samples: TransliterationSample[] =
  transliterationDataset satisfies TransliterationSample[];

/**
 * Evaluate the rule-based transliteration against the curated dataset from
 * https://github.com/Sofwath/div-transliteration.
 */
export function evaluateTransliterationBenchmark(
  options: TransliterationBenchmarkOptions = {},
): TransliterationBenchmarkSummary {
  const { limit } = options;
  const scopedSamples = typeof limit === "number" && limit > 0
    ? samples.slice(0, limit)
    : samples;

  const results = scopedSamples.map((sample) =>
    scoreTransliterationPair(sample.latin, sample.thaana)
  );

  const exactMatches =
    results.filter((result) => result.actual === result.expected)
      .length;
  const accuracy = results.length > 0 ? exactMatches / results.length : 0;
  const averageScore = results.length > 0
    ? results.reduce((sum, result) => sum + result.score, 0) / results.length
    : 0;

  return {
    total: results.length,
    exactMatches,
    accuracy,
    averageScore,
    results,
  };
}

export function getTransliterationSamples(): readonly TransliterationSample[] {
  return samples;
}
