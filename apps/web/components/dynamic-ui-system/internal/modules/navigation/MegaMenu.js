"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Column, Flex, Icon, Row, Text, ToggleButton } from "../../";
import styles from "./MegaMenu.module.scss";
export const MegaMenu = ({ menuGroups, className, ...rest }) => {
  const pathname = usePathname();
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [dropdownPosition, setDropdownPosition] = useState({
    left: 0,
    width: 0,
  });
  const [isFirstAppearance, setIsFirstAppearance] = useState(true);
  const dropdownRef = useRef(null);
  const buttonRefs = useRef({});
  const contentRefs = useRef({});
  useEffect(() => {
    if (activeDropdown && buttonRefs.current[activeDropdown]) {
      const buttonElement = buttonRefs.current[activeDropdown];
      if (buttonElement) {
        const rect = buttonElement.getBoundingClientRect();
        const parentRect =
          buttonElement.parentElement?.getBoundingClientRect() || { left: 0 };
        // Set initial position
        setDropdownPosition({
          left: rect.left - parentRect.left,
          width: 300, // Default width that will be updated
        });
        // Measure content after render
        requestAnimationFrame(() => {
          const contentElement = contentRefs.current[activeDropdown];
          if (contentElement) {
            const contentWidth = contentElement.scrollWidth;
            setDropdownPosition((prev) => ({
              ...prev,
              width: contentWidth + 40, // Add padding
            }));
          }
        });
      }
    } else {
      // Reset first appearance flag when dropdown is closed
      setIsFirstAppearance(true);
    }
  }, [activeDropdown]);
  // Reset animation flag after animation completes
  useEffect(() => {
    if (activeDropdown !== null) {
      const timer = setTimeout(() => {
        setIsFirstAppearance(false);
      }, 300); // Match animation duration
      return () => clearTimeout(timer);
    }
  }, [activeDropdown]);
  // Close dropdown when pathname changes (navigation occurs)
  useEffect(() => {
    setActiveDropdown(null);
  }, [pathname]);
  // Check if a menu item should be selected based on the current path
  const isSelected = (href) => {
    if (!href || !pathname) {
      return false;
    }
    return pathname.startsWith(href);
  };
  // Filter groups to only show those with sections in the dropdown
  const dropdownGroups = menuGroups.filter((group) => group.sections);
  // Add click handler to close dropdown when clicking on links
  const handleLinkClick = (href) => {
    setActiveDropdown(null);
    // Let the default navigation happen
  };
  return (_jsxs(Flex, {
    gap: "8",
    flex: 1,
    className: className,
    ...rest,
    children: [
      menuGroups.map((group, index) => (_jsx(Row, {
        ref: (el) => {
          buttonRefs.current[group.id] = el;
        },
        onMouseEnter: () => group.sections && setActiveDropdown(group.id),
        onMouseLeave: (e) => {
          // Check if we're not hovering over the dropdown
          const dropdownElement = dropdownRef.current;
          if (dropdownElement) {
            const rect = dropdownElement.getBoundingClientRect();
            if (
              e.clientX >= rect.left &&
              e.clientX <= rect.right &&
              e.clientY >= rect.top &&
              e.clientY <= rect.bottom
            ) {
              // We're hovering over the dropdown, don't hide it
              return;
            }
          }
          // Only hide if activeDropdown is this group
          if (activeDropdown === group.id) {
            setActiveDropdown(null);
          }
        },
        children: _jsxs(ToggleButton, {
          selected: group.selected !== undefined
            ? group.selected
            : isSelected(group.href),
          href: group.href,
          children: [
            group.label,
            group.sections && group.suffixIcon &&
            (_jsx(Icon, {
              marginLeft: "8",
              name: group.suffixIcon,
              size: "xs",
            })),
          ],
        }),
      }, `menu-group-${index}`))),
      activeDropdown &&
      (_jsx(Row, {
        paddingTop: "8",
        ref: dropdownRef,
        position: "absolute",
        pointerEvents: "auto",
        opacity: 100,
        top: "32",
        className: isFirstAppearance ? styles.dropdown : "",
        style: {
          left: `${dropdownPosition.left}px`,
          width: `${dropdownPosition.width}px`,
          transition: "left 0.3s ease, width 0.3s ease",
          visibility: "visible",
        },
        onMouseEnter: () => {
          // Keep the current active dropdown when hovering over it
        },
        onMouseLeave: () => {
          // Hide dropdown when mouse leaves it
          setActiveDropdown(null);
        },
        children: _jsx(Row, {
          background: "surface",
          radius: "l",
          border: "neutral-alpha-weak",
          shadow: "xl",
          padding: "12",
          gap: "32",
          children: dropdownGroups.map((group, groupIndex) =>
            activeDropdown === group.id &&
            group.sections && (_jsx(Row, {
              gap: "16",
              ref: (el) => {
                contentRefs.current[group.id] = el;
              },
              children: group.sections.map((
                section,
                sectionIndex,
              ) => (_jsxs(Column, {
                minWidth: 10,
                gap: "4",
                children: [
                  section.title &&
                  (_jsx(Text, {
                    marginLeft: "16",
                    marginBottom: "12",
                    marginTop: "12",
                    onBackground: "neutral-weak",
                    variant: "label-default-s",
                    children: section.title,
                  })),
                  section.links.map((link, linkIndex) => (_jsx(ToggleButton, {
                    className: "fit-height p-4 pr-12",
                    style: { height: "auto" },
                    fillWidth: true,
                    horizontal: "start",
                    href: link.href,
                    onClick: () => handleLinkClick(link.href),
                    children: link.description
                      ? (_jsxs(Row, {
                        gap: "12",
                        children: [
                          link.icon &&
                          (_jsx(Icon, {
                            name: link.icon,
                            size: "s",
                            padding: "8",
                            radius: "s",
                            border: "neutral-alpha-weak",
                          })),
                          _jsxs(Column, {
                            gap: "4",
                            children: [
                              _jsx(Text, {
                                onBackground: "neutral-strong",
                                variant: "label-strong-s",
                                children: link.label,
                              }),
                              _jsx(Text, {
                                onBackground: "neutral-weak",
                                children: link.description,
                              }),
                            ],
                          }),
                        ],
                      }))
                      : (link.label),
                  }, `link-${linkIndex}`))),
                ],
              }, `section-${sectionIndex}`))),
            }, `dropdown-content-${groupIndex}`))
          ),
        }),
      })),
    ],
  }));
};
MegaMenu.displayName = "MegaMenu";
//# sourceMappingURL=MegaMenu.js.map
