import glossaryData from "./data/glossary.json" with { type: "json" };
import {
  transliterateLatinToThaana,
  transliterateThaanaToLatin,
} from "./transliteration.ts";
import { containsThaana, levenshteinSimilarity } from "./utils.ts";

export interface GlossaryEntry {
  term: string;
  thaana: string;
  definition: string;
  variants: string[];
  domains: string[];
  sources: string[];
  notes?: string;
}

export interface GlossarySearchOptions {
  limit?: number;
  minimumScore?: number;
}

const BASE_ENTRIES: GlossaryEntry[] = (glossaryData as GlossaryEntry[]).map((
  entry,
) => ({
  ...entry,
  variants: entry.variants ?? [],
  domains: entry.domains ?? [],
  sources: entry.sources ?? [],
}));

export class Glossary {
  private entries: Map<string, GlossaryEntry> = new Map();

  constructor(initialEntries: GlossaryEntry[] = BASE_ENTRIES) {
    initialEntries.forEach((entry) => {
      this.entries.set(entry.term.toLowerCase(), entry);
    });
  }

  list(): GlossaryEntry[] {
    return [...this.entries.values()].sort((a, b) =>
      a.term.localeCompare(b.term)
    );
  }

  find(term: string): GlossaryEntry | undefined {
    return this.entries.get(term.toLowerCase());
  }

  upsert(entry: GlossaryEntry): GlossaryEntry {
    this.entries.set(entry.term.toLowerCase(), entry);
    return entry;
  }

  search(
    query: string,
    options: GlossarySearchOptions = {},
  ): Array<GlossaryEntry & { score: number }> {
    const { limit = 5, minimumScore = 0.5 } = options;
    const normalizedQuery = query.trim();

    if (!normalizedQuery) {
      return [];
    }

    const queryContainsThaana = containsThaana(normalizedQuery);
    const latinQuery = queryContainsThaana
      ? transliterateThaanaToLatin(normalizedQuery)
      : normalizedQuery;
    const thaanaQuery = queryContainsThaana
      ? normalizedQuery
      : transliterateLatinToThaana(normalizedQuery);
    const normalizedLatinQuery = latinQuery.trim().toLowerCase();
    const normalizedThaanaQuery = thaanaQuery.trim();

    const results = this.list().map((entry) => {
      const tokens = [entry.term, entry.thaana, ...entry.variants];
      const latinScores = tokens.map((token) => {
        const normalizedToken = containsThaana(token)
          ? transliterateThaanaToLatin(token).toLowerCase()
          : token.toLowerCase();
        return normalizedLatinQuery.length
          ? levenshteinSimilarity(normalizedLatinQuery, normalizedToken)
          : 0;
      });
      const thaanaScores = tokens.map((token) => {
        const normalizedToken = containsThaana(token)
          ? token
          : transliterateLatinToThaana(token);
        return normalizedThaanaQuery.length
          ? levenshteinSimilarity(normalizedThaanaQuery, normalizedToken)
          : 0;
      });
      const score = Math.max(...latinScores, ...thaanaScores);

      return {
        ...entry,
        score,
      };
    });

    return results
      .filter((entry) => entry.score >= minimumScore)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }
}

export const defaultGlossary = new Glossary();
