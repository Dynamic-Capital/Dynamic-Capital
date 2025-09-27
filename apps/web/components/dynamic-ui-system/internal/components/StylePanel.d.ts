import { Flex } from ".";
interface StylePanelProps extends React.ComponentProps<typeof Flex> {
  style?: React.CSSProperties;
  className?: string;
}
declare const StylePanel: import("react").ForwardRefExoticComponent<
  Omit<StylePanelProps, "ref"> & import("react").RefAttributes<HTMLDivElement>
>;
export { StylePanel };
//# sourceMappingURL=StylePanel.d.ts.map
