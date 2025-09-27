import React, { ReactNode } from "react";
import { Flex } from ".";
interface DialogProps extends Omit<React.ComponentProps<typeof Flex>, "title"> {
  isOpen: boolean;
  onClose: () => void;
  title: ReactNode | string;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  base?: boolean;
  stack?: boolean;
  onHeightChange?: (height: number) => void;
  minHeight?: number;
}
export declare const DialogProvider: React.FC<{
  children: React.ReactNode;
}>;
declare const Dialog: React.FC<DialogProps>;
export { Dialog };
//# sourceMappingURL=Dialog.d.ts.map
