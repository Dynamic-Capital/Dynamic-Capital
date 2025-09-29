import {
  containsThaana,
  levenshteinSimilarity,
} from "./utils.ts";
import {
  transliterateLatinToThaana,
  transliterateThaanaToLatin,
} from "./transliteration.ts";

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
      const score = similarity(query, segment);

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

function normalizeLatin(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeThaana(value: string): string {
  return value.trim();
}

function similarity(query: string, segment: TranslationSegment): number {
  const normalizedQuery = query.trim();
  if (!normalizedQuery.length) {
    return 0;
  }

  const queryContainsThaana = containsThaana(normalizedQuery);
  const queryLatin = queryContainsThaana
    ? normalizeLatin(transliterateThaanaToLatin(normalizedQuery))
    : normalizeLatin(normalizedQuery);
  const queryThaana = queryContainsThaana
    ? normalizeThaana(normalizedQuery)
    : normalizeThaana(transliterateLatinToThaana(normalizedQuery));

  const sourceLatin = normalizeLatin(segment.source);
  const targetThaana = normalizeThaana(segment.target);
  const targetLatin = normalizeLatin(transliterateThaanaToLatin(segment.target));

  const englishScore = queryLatin.length
    ? levenshteinSimilarity(queryLatin, sourceLatin)
    : 0;
  const thaanaScore = queryThaana.length
    ? levenshteinSimilarity(queryThaana, targetThaana)
    : 0;
  const crossLatinScore = queryContainsThaana && queryLatin.length
    ? levenshteinSimilarity(queryLatin, targetLatin)
    : 0;

  if (queryContainsThaana) {
    return Math.max(thaanaScore, englishScore, crossLatinScore);
  }

  return Math.max(englishScore, thaanaScore);
}
