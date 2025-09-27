import {
  CommonProps,
  DisplayProps,
  GridProps,
  SizeProps,
  SpacingProps,
  StyleProps,
} from "../interfaces";
interface ComponentProps
  extends
    GridProps,
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
declare const ServerGrid: import("react").ForwardRefExoticComponent<
  ComponentProps & import("react").RefAttributes<HTMLDivElement>
>;
export { ServerGrid };
export type { GridProps };
//# sourceMappingURL=ServerGrid.d.ts.map
