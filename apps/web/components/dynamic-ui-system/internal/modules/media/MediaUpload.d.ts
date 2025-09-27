import React from "react";
import { Flex } from "../../";
interface MediaUploadProps extends React.ComponentProps<typeof Flex> {
  onFileUpload?: (file: File) => Promise<void>;
  compress?: boolean;
  aspectRatio?: string;
  className?: string;
  style?: React.CSSProperties;
  initialPreviewImage?: string | null;
  emptyState?: React.ReactNode;
  quality?: number;
  sizes?: string;
  children?: React.ReactNode;
  convertTypes?: string[];
  resizeMaxWidth?: number;
  resizeMaxHeight?: number;
  resizeWidth?: number;
  resizeHeight?: number;
  loading?: boolean;
  accept?: string;
}
declare const MediaUpload: React.ForwardRefExoticComponent<
  Omit<MediaUploadProps, "ref"> & React.RefAttributes<HTMLInputElement>
>;
export { MediaUpload };
//# sourceMappingURL=MediaUpload.d.ts.map
