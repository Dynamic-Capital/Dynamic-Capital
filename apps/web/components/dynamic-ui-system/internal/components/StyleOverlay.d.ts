import { Flex, IconButton } from ".";
import { DisplayProps } from "../interfaces";
interface StyleOverlayProps extends React.ComponentProps<typeof Flex> {
  iconButtonProps?: Partial<React.ComponentProps<typeof IconButton>>;
  children: React.ReactNode;
  zIndex?: DisplayProps["zIndex"];
}
declare const StyleOverlay: import("react").ForwardRefExoticComponent<
  Omit<StyleOverlayProps, "ref"> & import("react").RefAttributes<HTMLDivElement>
>;
export { StyleOverlay };
//# sourceMappingURL=StyleOverlay.d.ts.map
