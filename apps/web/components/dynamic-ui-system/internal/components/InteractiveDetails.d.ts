import React from "react";
import { IconButtonProps } from ".";
interface InteractiveDetailsProps {
  label?: React.ReactNode;
  description?: React.ReactNode;
  disabled?: boolean;
  iconButtonProps?: IconButtonProps;
  onClick: () => void;
  className?: string;
  id?: string;
}
declare const InteractiveDetails: React.FC<InteractiveDetailsProps>;
export { InteractiveDetails };
export type { InteractiveDetailsProps };
//# sourceMappingURL=InteractiveDetails.d.ts.map
