import translationMemoryData from "./data/translation-memory.json" with {
  type: "json",
};
import { containsThaana, levenshteinSimilarity } from "./utils.ts";
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

type RawTranslationSegment = Omit<TranslationSegment, "updatedAt">;

interface IndexedSegment extends TranslationSegment {
  normalizedSourceLatin: string;
  normalizedTargetThaana: string;
  normalizedTargetLatin: string;
  sourceTokens: string[];
}

const BASE_SEGMENTS: RawTranslationSegment[] = (
  translationMemoryData as RawTranslationSegment[]
).map((segment) => ({
  ...segment,
  metadata: {
    ...segment.metadata,
    tags: segment.metadata?.tags ? [...segment.metadata.tags] : undefined,
  },
}));

export class TranslationMemory {
  private segments: Map<string, IndexedSegment> = new Map();

  constructor(initialSegments: RawTranslationSegment[] = BASE_SEGMENTS) {
    if (initialSegments.length) {
      this.bulkImport(initialSegments);
    }
  }

  add(segment: RawTranslationSegment): TranslationSegment {
    const indexed = this.index(segment);
    this.segments.set(indexed.id, indexed);
    return this.clone(indexed);
  }

  bulkImport(segments: RawTranslationSegment[]): TranslationSegment[] {
    return segments.map((segment) => this.add(segment));
  }

  remove(id: string): boolean {
    return this.segments.delete(id);
  }

  get(id: string): TranslationSegment | undefined {
    const segment = this.segments.get(id);
    return segment ? this.clone(segment) : undefined;
  }

  list(): TranslationSegment[] {
    return [...this.segments.values()]
      .map((segment) => this.clone(segment))
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  match(query: string, options: MatchOptions = {}): MatchResult[] {
    const { minimumScore = 0.6, limit = 5 } = options;
    const prepared = prepareQuery(query);

    if (!prepared.raw.length) {
      return [];
    }

    const candidates: Array<{ segment: IndexedSegment; score: number }> = [];

    for (const segment of this.segments.values()) {
      const score = similarity(prepared, segment);

      if (score >= minimumScore) {
        candidates.push({
          segment,
          score,
        });
      }
    }

    if (!candidates.length) {
      return [];
    }

    return candidates
      .sort((a, b) =>
        b.score - a.score ||
        b.segment.updatedAt.getTime() - a.segment.updatedAt.getTime()
      )
      .slice(0, limit)
      .map(({ segment, score }) => ({
        ...this.clone(segment),
        score,
      }));
  }

  private index(segment: RawTranslationSegment): IndexedSegment {
    const metadata: SegmentMetadata = {
      ...segment.metadata,
      tags: segment.metadata?.tags ? [...segment.metadata.tags] : undefined,
    };

    const enriched: TranslationSegment = {
      ...segment,
      metadata,
      updatedAt: new Date(),
    };

    const normalizedSourceLatin = normalizeLatin(enriched.source);

    return {
      ...enriched,
      normalizedSourceLatin,
      normalizedTargetThaana: normalizeThaana(enriched.target),
      normalizedTargetLatin: normalizeLatin(
        transliterateThaanaToLatin(enriched.target),
      ),
      sourceTokens: tokenizeLatin(normalizedSourceLatin),
    };
  }

  private clone(segment: IndexedSegment): TranslationSegment {
    return {
      id: segment.id,
      source: segment.source,
      target: segment.target,
      metadata: {
        ...segment.metadata,
        tags: segment.metadata.tags ? [...segment.metadata.tags] : undefined,
      },
      updatedAt: new Date(segment.updatedAt.getTime()),
    };
  }
}

function normalizeLatin(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeThaana(value: string): string {
  return value.trim();
}

interface PreparedQuery {
  raw: string;
  containsThaana: boolean;
  latin: string;
  thaana: string;
  latinTokens: string[];
}

function prepareQuery(query: string): PreparedQuery {
  const trimmed = query.trim();
  const contains = containsThaana(trimmed);
  const latin = contains
    ? normalizeLatin(transliterateThaanaToLatin(trimmed))
    : normalizeLatin(trimmed);
  const thaana = contains
    ? normalizeThaana(trimmed)
    : normalizeThaana(transliterateLatinToThaana(trimmed));

  return {
    raw: trimmed,
    containsThaana: contains,
    latin,
    thaana,
    latinTokens: tokenizeLatin(latin),
  };
}

function similarity(query: PreparedQuery, segment: IndexedSegment): number {
  const englishScore = query.latin.length
    ? levenshteinSimilarity(query.latin, segment.normalizedSourceLatin)
    : 0;
  const thaanaScore = query.thaana.length
    ? levenshteinSimilarity(query.thaana, segment.normalizedTargetThaana)
    : 0;
  const crossLatinScore = query.containsThaana && query.latin.length
    ? levenshteinSimilarity(query.latin, segment.normalizedTargetLatin)
    : 0;

  let score = query.containsThaana
    ? Math.max(thaanaScore, englishScore, crossLatinScore)
    : Math.max(englishScore, thaanaScore);

  if (query.containsThaana) {
    const includesQuery = segment.normalizedTargetThaana.includes(query.thaana);
    if (includesQuery) {
      score = Math.min(1, score + 0.05);
    } else {
      score *= 0.75;
    }
    return score;
  }

  const lexicalOverlap = overlapRatio(query.latinTokens, segment.sourceTokens);

  if (lexicalOverlap > 0) {
    score = Math.min(1, score + lexicalOverlap * 0.25);
  } else if (englishScore < 0.4) {
    score *= 0.5;
  }

  return score;
}

export const defaultTranslationMemory = new TranslationMemory();

function tokenizeLatin(value: string): string[] {
  return value.split(/[^a-z0-9]+/).filter(Boolean);
}

function overlapRatio(queryTokens: string[], sourceTokens: string[]): number {
  if (!queryTokens.length || !sourceTokens.length) {
    return 0;
  }

  const querySet = new Set(queryTokens);
  let overlap = 0;

  for (const token of sourceTokens) {
    if (querySet.has(token)) {
      overlap += 1;
    }
  }

  return overlap / queryTokens.length;
}
