/**
 * Returns a color from the schemes array with even distribution
 * Instead of sequential colors (0,1,2), this distributes them evenly across the color spectrum
 * For small sets (2-4 items), uses a predefined optimal distribution
 * @param index The index of the item in the series
 * @param totalItems Total number of items in the series (if known)
 * @returns A color from the schemes array
 */
export declare const getDistributedColor: (
  index: number,
  totalItems?: number,
) => string;
//# sourceMappingURL=colorDistribution.d.ts.map
