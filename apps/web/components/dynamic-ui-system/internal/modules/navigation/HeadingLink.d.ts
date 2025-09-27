import React from "react";
import { Flex } from "../../components";
interface HeadingLinkProps extends React.ComponentProps<typeof Flex> {
  id: string;
  as: "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
  children: React.ReactNode;
  style?: React.CSSProperties;
}
export declare const HeadingLink: React.FC<HeadingLinkProps>;
export {};
//# sourceMappingURL=HeadingLink.d.ts.map
