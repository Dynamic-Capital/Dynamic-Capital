"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  Column,
  Grid,
  Icon,
  IconButton,
  Input,
  Row,
  Scroller,
  SegmentedControl,
  Text,
} from ".";
import { useDebounce } from "../hooks/useDebounce";
const fallbackEmojiData = {
  smileys: [
    { char: "😀", description: "grinning face" },
    { char: "😃", description: "grinning face with big eyes" },
    { char: "😄", description: "grinning face with smiling eyes" },
    { char: "😁", description: "beaming face with smiling eyes" },
    { char: "😆", description: "grinning squinting face" },
    { char: "😅", description: "grinning face with sweat" },
    { char: "🤣", description: "rolling on the floor laughing" },
    { char: "😂", description: "face with tears of joy" },
  ],
  animals: [
    { char: "🐶", description: "dog face" },
    { char: "🐱", description: "cat face" },
    { char: "🐭", description: "mouse face" },
    { char: "🦊", description: "fox face" },
  ],
  food: [
    { char: "🍎", description: "red apple" },
    { char: "🍐", description: "pear" },
    { char: "🍊", description: "tangerine" },
    { char: "🍋", description: "lemon" },
  ],
  activities: [
    { char: "⚽", description: "soccer ball" },
    { char: "🏀", description: "basketball" },
    { char: "🏈", description: "american football" },
    { char: "⚾", description: "baseball" },
  ],
  travel: [
    { char: "🚗", description: "car" },
    { char: "🚕", description: "taxi" },
    { char: "🚙", description: "sport utility vehicle" },
    { char: "🚌", description: "bus" },
  ],
  objects: [
    { char: "💻", description: "laptop" },
    { char: "📱", description: "mobile phone" },
    { char: "💡", description: "light bulb" },
    { char: "🔍", description: "magnifying glass" },
  ],
  symbols: [
    { char: "❤️", description: "red heart" },
    { char: "💔", description: "broken heart" },
    { char: "💯", description: "hundred points" },
    { char: "✨", description: "sparkles" },
  ],
  flags: [
    { char: "🏁", description: "chequered flag" },
    { char: "🚩", description: "triangular flag" },
    { char: "🎌", description: "crossed flags" },
    { char: "🏴", description: "black flag" },
  ],
};
import generatedEmojiData from "../data/emoji-data.json";
const emojiData = Object.keys(generatedEmojiData).length > 0
  ? generatedEmojiData
  : fallbackEmojiData;
const EmojiPicker = (
  { onSelect, onClose, className, background, columns = "8", style, ...flex },
) => {
  const searchInputId = useId();
  const [inputValue, setInputValue] = useState("");
  const searchQuery = useDebounce(inputValue, 300);
  const [activeCategory, setActiveCategory] = useState("smileys");
  const [focusedEmojiIndex, setFocusedEmojiIndex] = useState(-1);
  const gridRef = useRef(null);
  const getCategoryIcon = (category) => {
    switch (category) {
      case "smileys":
        return "smiley";
      case "animals":
        return "paw";
      case "food":
        return "food";
      case "activities":
        return "ball";
      case "travel":
        return "world";
      case "objects":
        return "gift";
      case "symbols":
        return "symbol";
      case "flags":
        return "flag";
      default:
        return "smiley";
    }
  };
  const categoryButtons = Object.keys(emojiData).map((category) => ({
    value: category,
    children: _jsx(Icon, { name: getCategoryIcon(category), size: "s" }),
  }));
  const handleEmojiSelect = useCallback((emoji) => {
    onSelect(emoji);
    if (onClose) {
      onClose();
    }
  }, [onSelect, onClose]);
  const handleCategoryChange = useCallback((value) => {
    setActiveCategory(value);
  }, []);
  const filteredEmojis = searchQuery
    ? Object.values(emojiData)
      .flat()
      .filter((emoji) => emoji.description.includes(searchQuery.toLowerCase()))
    : emojiData[activeCategory] || [];
  // Reset focused index when filtered emojis change
  useEffect(() => {
    setFocusedEmojiIndex(-1);
  }, [filteredEmojis]);
  // Handle keyboard navigation
  const handleKeyDown = useCallback((e) => {
    if (filteredEmojis.length === 0) {
      return;
    }
    // Use provided columns prop for grid navigation
    const emojisPerRow = Number(columns) || 6;
    let newIndex = focusedEmojiIndex;
    switch (e.key) {
      case "ArrowRight":
        e.preventDefault();
        newIndex = focusedEmojiIndex < filteredEmojis.length - 1
          ? focusedEmojiIndex + 1
          : 0;
        break;
      case "ArrowLeft":
        e.preventDefault();
        newIndex = focusedEmojiIndex > 0
          ? focusedEmojiIndex - 1
          : filteredEmojis.length - 1;
        break;
      case "ArrowDown":
        e.preventDefault();
        newIndex = focusedEmojiIndex + emojisPerRow;
        if (newIndex >= filteredEmojis.length) {
          // Wrap to the beginning of the appropriate column
          newIndex = focusedEmojiIndex % emojisPerRow;
          if (newIndex >= filteredEmojis.length) {
            newIndex = filteredEmojis.length - 1;
          }
        }
        break;
      case "ArrowUp":
        e.preventDefault();
        newIndex = focusedEmojiIndex - emojisPerRow;
        if (newIndex < 0) {
          // Wrap to the end of the appropriate column
          const rowsCount = Math.ceil(filteredEmojis.length / emojisPerRow);
          newIndex = (rowsCount - 1) * emojisPerRow +
            (focusedEmojiIndex % emojisPerRow);
          if (newIndex >= filteredEmojis.length) {
            newIndex = filteredEmojis.length - 1;
          }
        }
        break;
      case "Enter":
      case " ":
        if (
          focusedEmojiIndex >= 0 && focusedEmojiIndex < filteredEmojis.length
        ) {
          e.preventDefault();
          handleEmojiSelect(filteredEmojis[focusedEmojiIndex].char);
        }
        break;
      default:
        return;
    }
    setFocusedEmojiIndex(newIndex);
  }, [filteredEmojis, focusedEmojiIndex, handleEmojiSelect, columns]);
  return (_jsxs(Column, {
    gap: "16",
    background: background,
    className: className,
    style: style,
    "data-testid": "emoji-picker",
    height: 24,
    ...flex,
    children: [
      _jsx(Input, {
        id: `emoji-search-${searchInputId}`,
        placeholder: "Search emojis",
        value: inputValue,
        height: "s",
        onChange: (e) => setInputValue(e.target.value),
        hasPrefix: _jsx(Icon, {
          size: "s",
          onBackground: "neutral-weak",
          name: "search",
        }),
        "aria-label": "Search emojis",
      }),
      _jsx(Scroller, {
        tabIndex: -1,
        direction: "column",
        fillHeight: true,
        fadeColor: background,
        children: filteredEmojis.length > 0
          ? (_jsx(Grid, {
            gap: "2",
            fillWidth: true,
            columns: columns,
            "aria-label": searchQuery
              ? "Search results"
              : `${activeCategory} emojis`,
            ref: gridRef,
            onKeyDown: handleKeyDown,
            tabIndex: -1,
            role: "grid",
            children: filteredEmojis.map((emoji, index) => {
              const isFocused = index === focusedEmojiIndex;
              return (_jsx(IconButton, {
                tabIndex: index === 0 || isFocused ? 0 : -1,
                variant: "tertiary",
                size: "l",
                onClick: () => handleEmojiSelect(emoji.char),
                "aria-label": emoji.description,
                title: emoji.description,
                style: {
                  transform: isFocused ? "scale(1.05)" : "scale(1)",
                  background: isFocused
                    ? "var(--neutral-alpha-weak)"
                    : "transparent",
                  transition: "transform 0.1s ease, outline 0.1s ease",
                },
                onFocus: () => setFocusedEmojiIndex(index),
                role: "gridcell",
                ref: isFocused ? (el) => el?.focus() : undefined,
                children: _jsx(Text, {
                  variant: "heading-default-xl",
                  children: emoji.char,
                }),
              }, index));
            }),
          }))
          : (_jsx(Row, {
            fill: true,
            center: true,
            align: "center",
            onBackground: "neutral-weak",
            children: "No results found",
          })),
      }),
      !searchQuery &&
      (_jsx(SegmentedControl, {
        buttons: categoryButtons,
        onToggle: handleCategoryChange,
        defaultSelected: activeCategory,
        fillWidth: true,
      })),
    ],
  }));
};
EmojiPicker.displayName = "EmojiPicker";
export { EmojiPicker };
//# sourceMappingURL=EmojiPicker.js.map
