import React, { ReactNode } from "react";
import { ArrowNavigationOptions } from "../hooks/useArrowNavigation";
interface ArrowNavigationContextType {
  focusedIndex: number;
  setFocusedIndex: (index: number) => void;
  handleKeyDown: (e: React.KeyboardEvent<HTMLElement>) => void;
  applyHighlightedState: () => void;
}
export interface ArrowNavigationProps
  extends Omit<ArrowNavigationOptions, "containerRef"> {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
  role?: string;
  "aria-label"?: string;
  trapFocus?: boolean;
  focusTrapActive?: boolean;
  onEscape?: () => void;
  autoFocusTrap?: boolean;
  restoreFocus?: boolean;
}
export declare const ArrowNavigation: React.FC<ArrowNavigationProps>;
/**
 * Hook to access the ArrowNavigation context
 */
export declare const useArrowNavigationContext: () =>
  ArrowNavigationContextType;
/**
 * Higher-order component to make a component navigable with arrow keys
 */
export declare function withArrowNavigation<P extends object>(
  Component: React.ComponentType<P>,
  options: Omit<ArrowNavigationProps, "children">,
): React.FC<
  P & {
    children?: ReactNode;
  }
>;
export default ArrowNavigation;
//# sourceMappingURL=ArrowNavigationContext.d.ts.map
