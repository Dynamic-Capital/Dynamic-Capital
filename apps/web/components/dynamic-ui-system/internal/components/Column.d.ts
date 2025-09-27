import { Flex } from ".";
export interface ColumnProps extends React.ComponentProps<typeof Flex> {
  children?: React.ReactNode;
}
declare const Column: import("react").ForwardRefExoticComponent<
  Omit<ColumnProps, "ref"> & import("react").RefAttributes<HTMLDivElement>
>;
export { Column };
//# sourceMappingURL=Column.d.ts.map
