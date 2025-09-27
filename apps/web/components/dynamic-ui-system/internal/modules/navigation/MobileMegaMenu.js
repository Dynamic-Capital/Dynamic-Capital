"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import {
  Accordion,
  Column,
  ElementType,
  Flex,
  Icon,
  Option,
  Text,
} from "../../";
const MobileMegaMenu = ({ menuGroups, onClose, ...flex }) => {
  const handleLinkClick = (href) => {
    onClose?.();
  };
  return (_jsx(Column, {
    fillWidth: true,
    gap: "4",
    ...flex,
    children: menuGroups.map((group) => {
      if (group.href && !group.sections) {
        return (_jsx(ElementType, {
          href: group.href,
          onLinkClick: () => group.href && handleLinkClick(group.href),
          children: _jsxs(Flex, {
            fillWidth: true,
            paddingY: "12",
            paddingX: "16",
            horizontal: "between",
            vertical: "center",
            radius: "l",
            cursor: "pointer",
            transition: "macro-medium",
            children: [
              _jsx(Text, {
                variant: "heading-strong-s",
                onBackground: "neutral-strong",
                children: group.label,
              }),
              group.suffixIcon &&
              (_jsx(Icon, {
                name: group.suffixIcon,
                size: "s",
                onBackground: "neutral-weak",
              })),
            ],
          }),
        }, `group-${group.id}`));
      }
      return (_jsx(Accordion, {
        title: group.label,
        icon: group.suffixIcon || "chevronDown",
        size: "m",
        radius: "l",
        children: group.sections &&
          (_jsx(Column, {
            gap: "4",
            fillWidth: true,
            children: group.sections.map((section, secIdx) => {
              const sectionKey = section.title
                ? `${group.id}-${section.title}`
                : `sec-${secIdx}`;
              return section.title
                ? (_jsx(Accordion, {
                  title: section.title,
                  size: "s",
                  radius: "m",
                  children: _jsx(Column, {
                    fitHeight: true,
                    fillWidth: true,
                    gap: "4",
                    children: section.links.map((
                      link,
                      linkIdx,
                    ) => (_jsx(Option, {
                      href: link.href,
                      tabIndex: 0,
                      onClick: () => handleLinkClick(link.href),
                      "aria-label": typeof link.label === "string"
                        ? link.label
                        : undefined,
                      label: link.label,
                      description: link.description,
                      value: link.href,
                      hasPrefix: link.icon
                        ? (_jsx(Icon, {
                          name: link.icon,
                          size: "s",
                          onBackground: "neutral-weak",
                        }))
                        : undefined,
                    }, `link-${linkIdx}`))),
                  }),
                }, sectionKey))
                : (_jsx(Column, {
                  fitHeight: true,
                  fillWidth: true,
                  gap: "4",
                  paddingX: "8",
                  children: section.links.map((link, linkIdx) => (_jsx(Option, {
                    href: link.href,
                    tabIndex: 0,
                    onClick: () => handleLinkClick(link.href),
                    "aria-label": typeof link.label === "string"
                      ? link.label
                      : undefined,
                    label: link.label,
                    description: link.description,
                    value: link.href,
                    hasPrefix: link.icon
                      ? (_jsx(Icon, {
                        name: link.icon,
                        size: "s",
                        onBackground: "neutral-weak",
                      }))
                      : undefined,
                  }, `link-${linkIdx}`))),
                }, sectionKey));
            }),
          })),
      }, `group-${group.id}`));
    }),
  }));
};
MobileMegaMenu.displayName = "MobileMegaMenu";
export { MobileMegaMenu };
//# sourceMappingURL=MobileMegaMenu.js.map
