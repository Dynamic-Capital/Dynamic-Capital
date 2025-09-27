import React, { ReactNode, RefObject } from "react";
interface FocusTrapProps {
  children: ReactNode;
  active: boolean;
  onEscape?: () => void;
  containerRef?: RefObject<HTMLDivElement>;
  className?: string;
  style?: React.CSSProperties;
  initialFocusRef?: RefObject<HTMLElement>;
  returnFocusRef?: RefObject<HTMLElement>;
  restoreFocus?: boolean;
  autoFocus?: boolean;
}
declare const FocusTrap: React.FC<FocusTrapProps>;
export { FocusTrap };
//# sourceMappingURL=FocusTrap.d.ts.map
