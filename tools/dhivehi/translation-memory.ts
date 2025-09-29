import { levenshteinSimilarity } from "./utils.ts";

export interface SegmentMetadata {
  domain?: string;
  source?: string;
  reviewer?: string;
  tags?: string[];
}

export interface TranslationSegment {
  id: string;
  source: string;
  target: string;
  metadata: SegmentMetadata;
  updatedAt: Date;
}

export interface MatchResult extends TranslationSegment {
  score: number;
}

export interface MatchOptions {
  minimumScore?: number;
  limit?: number;
}

export class TranslationMemory {
  private segments: Map<string, TranslationSegment> = new Map();

  add(segment: Omit<TranslationSegment, "updatedAt">): TranslationSegment {
    const enriched: TranslationSegment = {
      ...segment,
      updatedAt: new Date(),
    };

    this.segments.set(segment.id, enriched);

    return enriched;
  }

  bulkImport(
    segments: Array<Omit<TranslationSegment, "updatedAt">>,
  ): TranslationSegment[] {
    return segments.map((segment) => this.add(segment));
  }

  remove(id: string): boolean {
    return this.segments.delete(id);
  }

  get(id: string): TranslationSegment | undefined {
    return this.segments.get(id);
  }

  list(): TranslationSegment[] {
    return [...this.segments.values()].sort(
      (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime(),
    );
  }

  match(query: string, options: MatchOptions = {}): MatchResult[] {
    const { minimumScore = 0.6, limit = 5 } = options;

    const candidates = [...this.segments.values()].map((segment) => {
      const score = similarity(query, segment.source);

      return {
        ...segment,
        score,
      };
    });

    return candidates
      .filter((candidate) => candidate.score >= minimumScore)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }
}

function similarity(a: string, b: string): number {
  const normalizedA = a.trim().toLowerCase();
  const normalizedB = b.trim().toLowerCase();

  if (!normalizedA.length && !normalizedB.length) {
    return 1;
  }

  return levenshteinSimilarity(normalizedA, normalizedB);
}
