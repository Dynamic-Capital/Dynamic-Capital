import { Flex } from ".";
import { ReactNode } from "react";
type TableProps = React.ComponentProps<typeof Flex> & {
  data: {
    headers: {
      content: ReactNode;
      key: string;
      sortable?: boolean;
    }[];
    rows: ReactNode[][];
  };
  onRowClick?: (rowIndex: number) => void;
};
declare function Table(
  { data, onRowClick, ...flex }: TableProps,
): import("react/jsx-runtime").JSX.Element;
export { Table };
//# sourceMappingURL=Table.d.ts.map
