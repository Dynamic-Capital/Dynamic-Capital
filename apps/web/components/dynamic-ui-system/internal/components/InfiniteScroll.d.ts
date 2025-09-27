import React, { ReactNode } from "react";
import { Row } from ".";
export interface InfiniteScrollProps<T>
  extends React.ComponentProps<typeof Row> {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  loadMore: () => Promise<boolean>;
  loading?: boolean;
  threshold?: number;
  className?: string;
}
declare function InfiniteScroll<T>(
  { items, renderItem, loadMore, loading, threshold, ...flex }:
    InfiniteScrollProps<T>,
): import("react/jsx-runtime").JSX.Element;
declare namespace InfiniteScroll {
  var displayName: string;
}
export { InfiniteScroll };
//# sourceMappingURL=InfiniteScroll.d.ts.map
