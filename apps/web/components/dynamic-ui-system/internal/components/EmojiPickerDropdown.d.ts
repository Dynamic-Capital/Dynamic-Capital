import React from "react";
import { DropdownWrapper } from ".";
import { gridSize, StyleProps } from "..";
export interface EmojiPickerDropdownProps
  extends Omit<React.ComponentProps<typeof DropdownWrapper>, "dropdown"> {
  onSelect: (emoji: string) => void;
  background?: StyleProps["background"];
  columns?: gridSize;
}
declare const EmojiPickerDropdown: React.FC<EmojiPickerDropdownProps>;
export { EmojiPickerDropdown };
//# sourceMappingURL=EmojiPickerDropdown.d.ts.map
