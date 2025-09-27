import React, { ReactNode } from "react";
import { Flex } from ".";
interface FeedbackProps
  extends Omit<React.ComponentProps<typeof Flex>, "title"> {
  variant?: "info" | "danger" | "warning" | "success";
  icon?: boolean;
  title?: string;
  description?: string;
  showCloseButton?: boolean;
  onClose?: () => void;
  className?: string;
  style?: React.CSSProperties;
  children?: ReactNode;
}
declare const Feedback: React.ForwardRefExoticComponent<
  Omit<FeedbackProps, "ref"> & React.RefAttributes<HTMLDivElement>
>;
export { Feedback };
//# sourceMappingURL=Feedback.d.ts.map
