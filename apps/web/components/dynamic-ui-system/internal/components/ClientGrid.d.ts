import { DisplayProps, GridProps, StyleProps } from "../interfaces";
interface ClientGridProps extends GridProps, StyleProps, DisplayProps {
  cursor?: StyleProps["cursor"];
  xl?: any;
  l?: any;
  m?: any;
  s?: any;
  xs?: any;
  hide?: boolean;
}
declare const ClientGrid: import("react").ForwardRefExoticComponent<
  ClientGridProps & import("react").RefAttributes<HTMLDivElement>
>;
export { ClientGrid };
//# sourceMappingURL=ClientGrid.d.ts.map
