"use client";
import {
  Fragment as _Fragment,
  jsx as _jsx,
  jsxs as _jsxs,
} from "react/jsx-runtime";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Column, Flex, Icon, Input, Kbd, Option, Row, Text } from "../../";
import { createPortal } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import styles from "./Kbar.module.scss";
const SectionHeader = (
  { label },
) => (_jsx(Row, {
  paddingX: "12",
  paddingBottom: "8",
  paddingTop: "12",
  textVariant: "label-default-s",
  onBackground: "neutral-weak",
  children: label,
}));
export const KbarTrigger = ({ onClick, children, ...rest }) => {
  return (_jsx(Row, { onClick: onClick, ...rest, children: children }));
};
export const KbarContent = (
  { isOpen, onClose, items, placeholder = "Search" },
) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(null);
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const optionRefs = useRef([]);
  const router = useRouter();
  const [isClosing, setIsClosing] = useState(false);
  const handleClose = useCallback(() => {
    setIsClosing(true);
    // Add a small delay to allow animations to complete
    requestAnimationFrame(() => {
      onClose();
    });
  }, [onClose]);
  // Filter items based on search query
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (!searchQuery) {
        return true;
      }
      const searchLower = searchQuery.toLowerCase();
      return (item.name.toLowerCase().includes(searchLower) ||
        (item.keywords
          ? item.keywords.toLowerCase().includes(searchLower)
          : false) ||
        (item.section
          ? item.section.toLowerCase().includes(searchLower)
          : false));
    });
  }, [items, searchQuery]);
  // Group items by section
  const groupedItems = useMemo(() => {
    const sections = new Set(filteredItems.map((item) => item.section));
    const result = [];
    for (const section of sections) {
      // Add section header
      result.push({
        value: `section-${section}`,
        label: _jsx(SectionHeader, { label: section }),
        isCustom: true,
      });
      // Add items for this section
      const sectionItems = filteredItems.filter((item) =>
        item.section === section
      );
      for (const item of sectionItems) {
        result.push({
          value: item.id,
          label: item.name,
          hasPrefix: item.icon
            ? (_jsx(Icon, {
              name: item.icon,
              size: "xs",
              onBackground: "neutral-weak",
            }))
            : undefined,
          hasSuffix: item.shortcut && item.shortcut.length > 0
            ? (_jsx(Row, {
              gap: "2",
              style: { transform: "scale(0.9)", transformOrigin: "right" },
              children: item.shortcut.map((key, i) => (_jsxs(Row, {
                gap: "2",
                children: [
                  _jsx(Kbd, {
                    minWidth: "24",
                    style: { transform: "scale(0.8)" },
                    children: key,
                  }),
                  i < item.shortcut.length - 1 &&
                  _jsx(Text, { onBackground: "neutral-weak", children: "+" }),
                ],
              }, i))),
            }))
            : undefined,
          description: item.description,
          href: item.href,
          onClick: item.perform
            ? () => {
              item.perform?.();
              onClose();
            }
            : undefined,
        });
      }
    }
    return result;
  }, [filteredItems, onClose]);
  // Get non-custom options for highlighting
  const nonCustomOptions = useMemo(() => {
    return groupedItems.filter((item) => !item.isCustom);
  }, [groupedItems]);
  // Reset optionRefs when nonCustomOptions change
  useEffect(() => {
    optionRefs.current = Array(nonCustomOptions.length).fill(null);
  }, [nonCustomOptions.length]);
  // Reset highlighted index when search query changes
  useEffect(() => {
    setHighlightedIndex(nonCustomOptions.length > 0 ? 0 : null);
  }, [searchQuery, nonCustomOptions.length]);
  // Handle keyboard navigation
  const handleKeyDown = useCallback((e) => {
    if (!nonCustomOptions.length) {
      return;
    }
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prevIndex) => {
          if (prevIndex === null) {
            return 0;
          }
          return (prevIndex + 1) % nonCustomOptions.length;
        });
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prevIndex) => {
          if (prevIndex === null) {
            return nonCustomOptions.length - 1;
          }
          return (prevIndex - 1 + nonCustomOptions.length) %
            nonCustomOptions.length;
        });
        break;
      case "Enter":
        e.preventDefault();
        if (
          highlightedIndex !== null &&
          highlightedIndex < nonCustomOptions.length
        ) {
          const selectedOption = nonCustomOptions[highlightedIndex];
          if (selectedOption) {
            // Find the original item to get the perform function or href
            const originalItem = items.find((item) =>
              item.id === selectedOption.value
            );
            if (originalItem) {
              if (originalItem.href) {
                router.push(originalItem.href);
                onClose();
              } else if (originalItem.perform) {
                originalItem.perform();
                onClose();
              }
            }
          }
        }
        break;
    }
  }, [nonCustomOptions, items, router, onClose, highlightedIndex]);
  // Scroll highlighted element into view
  useEffect(() => {
    if (isOpen && highlightedIndex !== null && nonCustomOptions.length > 0) {
      // Use requestAnimationFrame to ensure the DOM has updated
      requestAnimationFrame(() => {
        const highlightedElement = optionRefs.current[highlightedIndex];
        const scrollContainer = scrollContainerRef.current;
        if (highlightedElement && scrollContainer) {
          const elementRect = highlightedElement.getBoundingClientRect();
          const containerRect = scrollContainer.getBoundingClientRect();
          // Check if the element is not fully visible
          if (elementRect.bottom > containerRect.bottom) {
            // Element is below the visible area - scroll just enough to show it
            const scrollAmount = elementRect.bottom - containerRect.bottom + 8; // Add a small buffer
            scrollContainer.scrollTop += scrollAmount;
          } else if (elementRect.top < containerRect.top) {
            // Element is above the visible area - scroll just enough to show it
            const scrollAmount = containerRect.top - elementRect.top + 8; // Add a small buffer
            scrollContainer.scrollTop -= scrollAmount;
          }
        }
      });
    }
  }, [highlightedIndex, isOpen, nonCustomOptions.length]);
  // Handle escape key
  useEffect(() => {
    const handleEscapeKey = (e) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEscapeKey);
    }
    return () => {
      document.removeEventListener("keydown", handleEscapeKey);
    };
  }, [isOpen, handleClose]);
  // Lock body scroll when kbar is open
  useEffect(() => {
    if (isOpen) {
      // Prevent body scrolling when kbar is open
      document.body.style.overflow = "hidden";
    } else {
      // Restore body scrolling when kbar is closed
      document.body.style.overflow = "unset";
    }
    return () => {
      // Cleanup function to ensure body scroll is restored
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);
  // Clear search query when kbar is closed
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery("");
      setHighlightedIndex(null);
    } else {
      // Set the first item as highlighted when opened
      if (nonCustomOptions.length > 0) {
        setHighlightedIndex(0);
      }
    }
  }, [isOpen, nonCustomOptions]);
  // Focus search input when kbar is opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      // Use a small timeout to ensure the component is fully rendered
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);
  // Handle search input change
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };
  // Render nothing if not open
  if (!isOpen) {
    return null;
  }
  // Create portal for the kbar
  return (_jsx(Row, {
    position: "fixed",
    top: "0",
    left: "0",
    right: "0",
    bottom: "0",
    zIndex: 10,
    center: true,
    background: "overlay",
    className: `${styles.overlay} ${isClosing ? styles.closing : ""}`,
    onClick: (e) => {
      if (e.target === e.currentTarget) {
        handleClose();
      }
    },
    children: _jsxs(Column, {
      ref: containerRef,
      maxHeight: 32,
      fitHeight: true,
      maxWidth: "xs",
      background: "surface",
      radius: "l-4",
      border: "neutral-alpha-medium",
      overflow: "hidden",
      shadow: "l",
      className: `${styles.content} ${isClosing ? styles.closing : ""}`,
      onClick: (e) => e.stopPropagation(),
      children: [
        _jsx(Row, {
          fillWidth: true,
          padding: "8",
          children: _jsx(Input, {
            id: "kbar-search",
            placeholder: placeholder,
            value: searchQuery,
            onChange: handleSearchChange,
            onKeyDown: handleKeyDown,
            ref: inputRef,
            hasPrefix: _jsx(Icon, {
              marginLeft: "4",
              onBackground: "neutral-weak",
              name: "search",
              size: "xs",
            }),
            autoComplete: "off",
          }),
        }),
        _jsxs(Column, {
          ref: scrollContainerRef,
          fillWidth: true,
          padding: "4",
          gap: "2",
          overflowY: "auto",
          radius: "l",
          border: "neutral-alpha-weak",
          children: [
            groupedItems.map((option, index) => {
              if (option.isCustom) {
                return _jsx(
                  React.Fragment,
                  { children: option.label },
                  option.value,
                );
              }
              // Find the index in the non-custom options array
              const optionIndex = nonCustomOptions.findIndex((item) =>
                item.value === option.value
              );
              const isHighlighted = optionIndex === highlightedIndex;
              return (_jsx(Option, {
                ref: (el) => {
                  if (
                    optionIndex >= 0 && optionIndex < optionRefs.current.length
                  ) {
                    optionRefs.current[optionIndex] = el;
                  }
                },
                label: option.label,
                value: option.value,
                hasPrefix: option.hasPrefix,
                hasSuffix: option.hasSuffix,
                description: option.description,
                ...(option.href
                  ? {
                    href: option.href,
                    onClick: undefined,
                    onLinkClick: onClose,
                  }
                  : { onClick: option.onClick }),
                highlighted: isHighlighted,
              }, option.value));
            }),
            searchQuery && filteredItems.length === 0 &&
            (_jsx(Flex, {
              fillWidth: true,
              center: true,
              paddingX: "16",
              paddingY: "64",
              textVariant: "body-default-m",
              onBackground: "neutral-weak",
              children: "No results found",
            })),
          ],
        }),
        _jsx(Row, {
          fillWidth: true,
          paddingX: "24",
          paddingY: "8",
          children: _jsxs(Row, {
            style: { transform: "scale(0.8)", transformOrigin: "left" },
            gap: "8",
            onBackground: "neutral-weak",
            textVariant: "label-default-m",
            vertical: "center",
            children: [
              _jsx(Kbd, {
                minWidth: "20",
                children: _jsx(Row, {
                  children: _jsx(Icon, { name: "chevronUp", size: "xs" }),
                }),
              }),
              _jsx(Kbd, {
                minWidth: "20",
                children: _jsx(Row, {
                  children: _jsx(Icon, { name: "chevronDown", size: "xs" }),
                }),
              }),
              _jsx(Text, {
                marginLeft: "8",
                marginRight: "24",
                children: "Navigate",
              }),
              _jsx(Kbd, {
                minWidth: "20",
                children: _jsx(Row, {
                  children: _jsx(Icon, { name: "enter", size: "xs" }),
                }),
              }),
              _jsx(Text, { marginLeft: "8", children: "Go to" }),
            ],
          }),
        }),
      ],
    }),
  }));
};
export const Kbar = ({ items, children, ...rest }) => {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const handleOpen = () => {
    setIsOpen(true);
  };
  const handleClose = () => {
    setIsOpen(false);
  };
  // Close Kbar when pathname changes
  useEffect(() => {
    if (isOpen) {
      handleClose();
    }
  }, [pathname]);
  // Add keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Check for Command+K (Mac) or Control+K (Windows/Linux)
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault(); // Prevent default browser behavior
        setIsOpen((prev) => !prev); // Toggle Kbar open/close
      }
    };
    // Add the event listener
    document.addEventListener("keydown", handleKeyDown);
    // Clean up the event listener on component unmount
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);
  return (_jsxs(_Fragment, {
    children: [
      _jsx(KbarTrigger, { onClick: handleOpen, ...rest, children: children }),
      isOpen &&
      createPortal(
        _jsx(KbarContent, {
          isOpen: isOpen,
          onClose: handleClose,
          items: items,
        }),
        document.body,
      ),
    ],
  }));
};
//# sourceMappingURL=Kbar.js.map
