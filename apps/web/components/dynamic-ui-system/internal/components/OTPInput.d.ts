import React from "react";
interface OTPInputProps extends React.HTMLAttributes<HTMLDivElement> {
  length?: number;
  onComplete?: (code: string) => void;
  error?: boolean;
  errorMessage?: React.ReactNode;
  disabled?: boolean;
  autoFocus?: boolean;
}
declare const OTPInput: React.ForwardRefExoticComponent<
  OTPInputProps & React.RefAttributes<HTMLDivElement>
>;
export { OTPInput };
export type { OTPInputProps };
//# sourceMappingURL=OTPInput.d.ts.map
