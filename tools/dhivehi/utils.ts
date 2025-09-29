export function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = Array.from({ length: a.length + 1 }, (_, row) => {
    const initial = Array(b.length + 1).fill(0);
    initial[0] = row;
    return initial;
  });

  for (let column = 0; column <= b.length; column += 1) {
    matrix[0][column] = column;
  }

  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;

      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      );
    }
  }

  return matrix[a.length][b.length];
}

export function levenshteinSimilarity(a: string, b: string): number {
  if (a === b) {
    return 1;
  }

  const distance = levenshteinDistance(a, b);
  const maxLength = Math.max(a.length, b.length) || 1;

  return 1 - distance / maxLength;
}

const THAANA_REGEX = /[\u0780-\u07BF]/;

/**
 * Quick heuristic to determine if a string contains Thaana characters.
 */
export function containsThaana(text: string): boolean {
  return THAANA_REGEX.test(text);
}
