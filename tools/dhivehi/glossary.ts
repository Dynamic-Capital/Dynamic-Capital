import glossaryData from "./data/glossary.json" with { type: "json" };
import { transliterateLatinToThaana } from "./transliteration.ts";
import { levenshteinSimilarity } from "./utils.ts";

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

    const results = this.list().map((entry) => {
      const tokens = [entry.term, entry.thaana, ...entry.variants];
      const score = Math.max(
        ...tokens.map((token) => levenshteinSimilarity(normalizedQuery, token)),
        levenshteinSimilarity(
          transliterateLatinToThaana(normalizedQuery),
          entry.thaana,
        ),
      );

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
