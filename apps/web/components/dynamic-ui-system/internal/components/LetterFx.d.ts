import React, { ReactNode } from "react";
type LetterFxProps = {
  children: ReactNode;
  trigger?: "hover" | "instant" | "custom";
  speed?: "fast" | "medium" | "slow";
  charset?: string[];
  onTrigger?: (triggerFn: () => void) => void;
  className?: string;
  style?: React.CSSProperties;
};
declare const LetterFx: React.ForwardRefExoticComponent<
  LetterFxProps & React.RefAttributes<HTMLSpanElement>
>;
export { LetterFx };
//# sourceMappingURL=LetterFx.d.ts.map
