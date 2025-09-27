import { Flex } from ".";
import { gridSize, StyleProps } from "../";
export interface EmojiPickerProps
  extends Omit<React.ComponentProps<typeof Flex>, "onSelect"> {
  onSelect: (emoji: string) => void;
  onClose?: () => void;
  className?: string;
  background?: StyleProps["background"];
  columns?: gridSize;
  style?: React.CSSProperties;
}
declare const EmojiPicker: {
  (
    { onSelect, onClose, className, background, columns, style, ...flex }:
      EmojiPickerProps,
  ): import("react/jsx-runtime").JSX.Element;
  displayName: string;
};
export { EmojiPicker };
//# sourceMappingURL=EmojiPicker.d.ts.map
