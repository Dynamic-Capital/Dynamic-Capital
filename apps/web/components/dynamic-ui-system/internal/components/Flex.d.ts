import {
  CommonProps,
  DisplayProps,
  FlexProps,
  SizeProps,
  SpacingProps,
  StyleProps,
} from "../interfaces";
interface SmartFlexProps
  extends
    FlexProps,
    StyleProps,
    SpacingProps,
    SizeProps,
    CommonProps,
    DisplayProps {
  xl?: any;
  l?: any;
  m?: any;
  s?: any;
  xs?: any;
}
declare const Flex: import("react").ForwardRefExoticComponent<
  SmartFlexProps & import("react").RefAttributes<HTMLDivElement>
>;
export { Flex };
//# sourceMappingURL=Flex.d.ts.map
