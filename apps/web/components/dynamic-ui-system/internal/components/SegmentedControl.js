"use client";
import { jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useRef, useState } from "react";
import { Flex, Scroller, ToggleButton } from ".";
const SegmentedControl = (
  {
    buttons,
    onToggle,
    defaultSelected,
    fillWidth = true,
    selected,
    className,
    style,
    ...scrollerProps
  },
) => {
  const [internalSelected, setInternalSelected] = useState(() => {
    if (selected !== undefined) {
      return selected;
    }
    if (defaultSelected !== undefined) {
      return defaultSelected;
    }
    return buttons[0]?.value || "";
  });
  const buttonRefs = useRef([]);
  useEffect(() => {
    if (selected !== undefined) {
      setInternalSelected(selected);
    }
  }, [selected]);
  const handleButtonClick = (clickedButton, event) => {
    event.stopPropagation();
    const newSelected = clickedButton.value;
    setInternalSelected(newSelected);
    onToggle(newSelected, event);
  };
  const handleKeyDown = (event) => {
    const focusedIndex = buttonRefs.current.findIndex((ref) =>
      ref === document.activeElement
    );
    switch (event.key) {
      case "ArrowLeft":
      case "ArrowUp":
        event.preventDefault();
        const prevIndex = focusedIndex === -1
          ? buttons.length - 1 // If nothing is focused, focus the last item
          : focusedIndex > 0
          ? focusedIndex - 1
          : buttons.length - 1;
        buttonRefs.current[prevIndex]?.focus();
        break;
      case "ArrowRight":
      case "ArrowDown":
        event.preventDefault();
        const nextIndex = focusedIndex === -1
          ? 0 // If nothing is focused, focus the first item
          : focusedIndex < buttons.length - 1
          ? focusedIndex + 1
          : 0;
        buttonRefs.current[nextIndex]?.focus();
        break;
      case "Enter":
      case " ": // Space key
        event.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < buttons.length) {
          const focusedButton = buttons[focusedIndex];
          setInternalSelected(focusedButton.value);
          onToggle(focusedButton.value);
        }
        break;
      default:
        return;
    }
  };
  const selectedIndex = buttons.findIndex((button) =>
    button.value === internalSelected
  );
  return (_jsx(Scroller, {
    direction: "row",
    fillWidth: fillWidth,
    minWidth: 0,
    ...scrollerProps,
    role: "tablist",
    "aria-orientation": "horizontal",
    onKeyDown: handleKeyDown,
    children: _jsx(Flex, {
      fillWidth: fillWidth,
      gap: "-1",
      children: buttons.map((button, index) => {
        return (_jsx(ToggleButton, {
          ref: (el) => {
            buttonRefs.current[index] = el;
          },
          variant: "outline",
          radius: index === 0
            ? "left"
            : index === buttons.length - 1
            ? "right"
            : "none",
          selected: index === selectedIndex,
          onClick: (event) => handleButtonClick(button, event),
          role: "tab",
          className: className,
          style: style,
          "aria-selected": index === selectedIndex,
          "aria-controls": `panel-${button.value}`,
          tabIndex: index === selectedIndex ? 0 : -1,
          fillWidth: fillWidth,
          ...button,
        }, button.value));
      }),
    }),
  }));
};
SegmentedControl.displayName = "SegmentedControl";
export { SegmentedControl };
//# sourceMappingURL=SegmentedControl.js.map
