import { Column } from ".";
interface BlockQuoteProps extends React.ComponentProps<typeof Column> {
  children: React.ReactNode;
  preline?: React.ReactNode;
  subline?: React.ReactNode;
  separator?: "top" | "bottom" | "both" | "none";
  author?: {
    name?: React.ReactNode;
    avatar?: string;
  };
  link?: {
    href: string;
    label: string;
  };
  style?: React.CSSProperties;
  className?: string;
  align?: "center" | "left" | "right";
}
declare const BlockQuote: import("react").ForwardRefExoticComponent<
  Omit<BlockQuoteProps, "ref"> & import("react").RefAttributes<HTMLDivElement>
>;
export { BlockQuote };
//# sourceMappingURL=BlockQuote.d.ts.map
