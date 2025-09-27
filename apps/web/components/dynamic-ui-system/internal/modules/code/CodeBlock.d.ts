import React, { ReactNode } from "react";
import { Language, SpacingToken } from "../../types";
import { Flex } from "../../components";
type CodeInstance = {
  code: string | {
    content: string;
    error: string | null;
  };
  language: Language | ["diff", Language];
  label: string;
  highlight?: string;
  prefixIcon?: string;
  startLineNumber?: number;
};
interface CodeBlockProps extends React.ComponentProps<typeof Flex> {
  codeHeight?: number;
  fillHeight?: boolean;
  previewPadding?: SpacingToken;
  codes?: CodeInstance[];
  preview?: ReactNode;
  copyButton?: boolean;
  styleButton?: boolean;
  reloadButton?: boolean;
  fullscreenButton?: boolean;
  compact?: boolean;
  className?: string;
  style?: React.CSSProperties;
  onInstanceChange?: (index: number) => void;
  lineNumbers?: boolean;
  highlight?: string;
}
declare const CodeBlock: React.FC<CodeBlockProps>;
export { CodeBlock };
//# sourceMappingURL=CodeBlock.d.ts.map
