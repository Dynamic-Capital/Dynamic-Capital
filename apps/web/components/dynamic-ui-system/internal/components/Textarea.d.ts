import React, { ReactNode, TextareaHTMLAttributes } from "react";
interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  id: string;
  label?: string;
  placeholder?: string;
  lines?: number | "auto";
  error?: boolean;
  errorMessage?: ReactNode;
  description?: ReactNode;
  radius?:
    | "none"
    | "top"
    | "right"
    | "bottom"
    | "left"
    | "top-left"
    | "top-right"
    | "bottom-right"
    | "bottom-left";
  className?: string;
  surfaceClassName?: string;
  textareaClassName?: string;
  hasPrefix?: ReactNode;
  hasSuffix?: ReactNode;
  resize?: "horizontal" | "vertical" | "both" | "none";
  validate?: (value: ReactNode) => ReactNode | null;
}
declare const Textarea: React.ForwardRefExoticComponent<
  TextareaProps & React.RefAttributes<HTMLTextAreaElement>
>;
export { Textarea };
export type { TextareaProps };
//# sourceMappingURL=Textarea.d.ts.map
