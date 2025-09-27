import React, { CSSProperties, ReactNode } from "react";
import { Flex } from ".";
export interface MediaProps extends React.ComponentProps<typeof Flex> {
  aspectRatio?: string;
  height?: number;
  alt?: string;
  loading?: boolean;
  objectFit?: CSSProperties["objectFit"];
  enlarge?: boolean;
  src: string;
  unoptimized?: boolean;
  sizes?: string;
  priority?: boolean;
  caption?: ReactNode;
  fill?: boolean;
  fillWidth?: boolean;
  style?: CSSProperties;
  className?: string;
}
declare const Media: React.FC<MediaProps>;
export { Media };
//# sourceMappingURL=Media.d.ts.map
