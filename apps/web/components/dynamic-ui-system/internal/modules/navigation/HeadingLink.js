"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback } from "react";
import { Flex, Heading, IconButton } from "../../components";
import { useToast } from "../../contexts";
import styles from "./HeadingLink.module.scss";
const variantMap = {
  h1: "display-strong-xs",
  h2: "heading-strong-xl",
  h3: "heading-strong-l",
  h4: "heading-strong-m",
  h5: "heading-strong-s",
  h6: "heading-strong-xs",
};
export const HeadingLink = ({ id, as, children, style, ...flex }) => {
  const { addToast } = useToast();
  const copyURL = useCallback((id) => {
    try {
      const url = `${window.location.origin}${window.location.pathname}#${id}`;
      navigator.clipboard.writeText(url).then(() => {
        addToast?.({
          variant: "success",
          message: "Link copied to clipboard.",
        });
      }, () => {
        addToast?.({
          variant: "danger",
          message: "Failed to copy link.",
        });
      });
    } catch (error) {
      console.error("Error copying to clipboard:", error);
    }
  }, [addToast]);
  const variant = variantMap[as];
  return (_jsxs(Flex, {
    style: style,
    onClick: () => copyURL(id),
    className: styles.control,
    vertical: "center",
    gap: "8",
    ...flex,
    children: [
      _jsx(Heading, {
        className: styles.text,
        id: id,
        variant: variant,
        as: as,
        children: children,
      }),
      _jsx(IconButton, {
        className: styles.visibility,
        size: "m",
        icon: "link",
        variant: "secondary",
        tooltip: "Copy",
        tooltipPosition: "right",
      }),
    ],
  }));
};
//# sourceMappingURL=HeadingLink.js.map
