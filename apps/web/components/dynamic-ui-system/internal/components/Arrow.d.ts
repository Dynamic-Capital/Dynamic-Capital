import { Flex } from ".";
interface ArrowProps extends React.ComponentProps<typeof Flex> {
  trigger: string;
  scale?: number;
  color?: "onBackground" | "onSolid";
  style?: React.CSSProperties;
  className?: string;
}
declare const Arrow: React.FC<ArrowProps>;
export { Arrow };
//# sourceMappingURL=Arrow.d.ts.map
