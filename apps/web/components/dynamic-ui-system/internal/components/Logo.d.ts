import React from "react";
interface LogoProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  className?: string;
  size?: "xs" | "s" | "m" | "l" | "xl";
  style?: React.CSSProperties;
  icon?: string;
  wordmark?: string;
  href?: string;
  dark?: boolean;
  light?: boolean;
  brand?: {
    copy?: boolean;
    url?: string;
  };
}
declare const Logo: React.FC<LogoProps>;
export { Logo };
//# sourceMappingURL=Logo.d.ts.map
