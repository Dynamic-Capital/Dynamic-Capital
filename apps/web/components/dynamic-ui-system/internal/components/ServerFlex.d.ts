import {
  CommonProps,
  DisplayProps,
  FlexProps,
  SizeProps,
  SpacingProps,
  StyleProps,
} from "../interfaces";
interface ComponentProps
  extends
    FlexProps,
    SpacingProps,
    SizeProps,
    StyleProps,
    CommonProps,
    DisplayProps {
  xl?: any;
  l?: any;
  m?: any;
  s?: any;
  xs?: any;
}
declare const ServerFlex: import("react").ForwardRefExoticComponent<
  ComponentProps & import("react").RefAttributes<HTMLDivElement>
>;
export { ServerFlex };
//# sourceMappingURL=ServerFlex.d.ts.map
