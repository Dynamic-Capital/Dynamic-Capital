import React from "react";
import { Text } from ".";
interface ListItemProps extends React.ComponentPropsWithoutRef<typeof Text> {
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}
declare const ListItem: React.ForwardRefExoticComponent<
  Omit<ListItemProps, "ref"> & React.RefAttributes<HTMLLIElement>
>;
export { ListItem };
//# sourceMappingURL=ListItem.d.ts.map
