"use client";
import { jsx as _jsx } from "react/jsx-runtime";
import { DropdownWrapper, EmojiPicker } from ".";
const EmojiPickerDropdown = (
  {
    trigger,
    onSelect,
    closeAfterClick = true,
    background = "surface",
    columns = "8",
    ...dropdownProps
  },
) => {
  const handleEmojiSelect = (emoji) => {
    onSelect(emoji);
    if (closeAfterClick) {
      dropdownProps.onOpenChange?.(false);
    }
  };
  return (_jsx(DropdownWrapper, {
    ...dropdownProps,
    trigger: trigger,
    dropdown: _jsx(EmojiPicker, {
      columns: columns,
      padding: "8",
      onSelect: handleEmojiSelect,
      onClose: closeAfterClick
        ? () => dropdownProps.onOpenChange?.(false)
        : undefined,
      background: background,
    }),
  }));
};
export { EmojiPickerDropdown };
//# sourceMappingURL=EmojiPickerDropdown.js.map
