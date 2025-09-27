import {
  CommonProps,
  DisplayProps,
  GridProps,
  SizeProps,
  SpacingProps,
  StyleProps,
} from "../interfaces";
interface SmartGridProps
  extends
    GridProps,
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
declare const Grid: import("react").ForwardRefExoticComponent<
  SmartGridProps & import("react").RefAttributes<HTMLDivElement>
>;
export { Grid };
//# sourceMappingURL=Grid.d.ts.map
