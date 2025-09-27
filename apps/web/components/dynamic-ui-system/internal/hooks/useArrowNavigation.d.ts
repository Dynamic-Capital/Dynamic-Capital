import { KeyboardEvent, RefObject } from "react";
export type NavigationLayout = "row" | "column" | "grid";
export interface ArrowNavigationOptions {
  layout: NavigationLayout;
  itemCount: number;
  columns?: number;
  containerRef?: RefObject<HTMLElement | HTMLDivElement | null>;
  onSelect?: (index: number) => void;
  onFocusChange?: (index: number) => void;
  wrap?: boolean;
  initialFocusedIndex?: number;
  itemSelector?: string;
  autoFocus?: boolean;
  disabled?: boolean;
  disableHighlighting?: boolean;
}
export declare const useArrowNavigation: ({
  layout,
  itemCount,
  columns,
  containerRef,
  onSelect,
  onFocusChange,
  wrap,
  initialFocusedIndex,
  itemSelector,
  autoFocus,
  disabled,
  disableHighlighting,
}: ArrowNavigationOptions) => {
  focusedIndex: number;
  setFocusedIndex: import("react").Dispatch<
    import("react").SetStateAction<number>
  >;
  handleKeyDown: (e: KeyboardEvent<HTMLElement>) => void;
  applyHighlightedState: () => void;
};
//# sourceMappingURL=useArrowNavigation.d.ts.map
