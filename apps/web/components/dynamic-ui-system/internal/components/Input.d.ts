import React, { InputHTMLAttributes, ReactNode } from "react";
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label?: string;
  placeholder?: string;
  height?: "s" | "m";
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
  inputClassName?: string;
  style?: React.CSSProperties;
  hasPrefix?: ReactNode;
  hasSuffix?: ReactNode;
  cursor?: undefined | "interactive";
  validate?: (value: ReactNode) => ReactNode | null;
}
declare const Input: React.ForwardRefExoticComponent<
  InputProps & React.RefAttributes<HTMLInputElement>
>;
export { Input };
export type { InputProps };
//# sourceMappingURL=Input.d.ts.map
