import { DisplayProps, FlexProps, StyleProps } from "../interfaces";
interface ClientFlexProps extends FlexProps, StyleProps, DisplayProps {
  cursor?: StyleProps["cursor"];
  xl?: any;
  l?: any;
  m?: any;
  s?: any;
  xs?: any;
  hide?: boolean;
}
declare const ClientFlex: import("react").ForwardRefExoticComponent<
  ClientFlexProps & import("react").RefAttributes<HTMLDivElement>
>;
export { ClientFlex };
//# sourceMappingURL=ClientFlex.d.ts.map
