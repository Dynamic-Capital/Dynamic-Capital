import { jsx as _jsx } from "react/jsx-runtime";
import Link from "next/link";
import { forwardRef } from "react";
import { Flex } from ".";
const isExternalLink = (url) => /^https?:\/\//.test(url);
const ElementType = forwardRef(
  (
    { href, type, onClick, onLinkClick, children, className, style, ...props },
    ref,
  ) => {
    if (href) {
      const isExternal = isExternalLink(href);
      if (isExternal) {
        return (_jsx("a", {
          href: href,
          target: "_blank",
          rel: "noreferrer",
          ref: ref,
          className: className,
          style: style,
          onClick: () => onLinkClick?.(),
          ...props,
          children: children,
        }));
      }
      return (_jsx(Link, {
        href: href,
        ref: ref,
        className: className,
        style: style,
        onClick: () => onLinkClick?.(),
        ...props,
        children: children,
      }));
    }
    if (onClick || type === "submit" || type === "button") {
      return (_jsx("button", {
        ref: ref,
        className: className,
        onClick: onClick,
        style: style,
        type: type,
        ...props,
        children: children,
      }));
    }
    return (_jsx(Flex, {
      ref: ref,
      className: className,
      style: style,
      ...props,
      children: children,
    }));
  },
);
ElementType.displayName = "ElementType";
export { ElementType };
//# sourceMappingURL=ElementType.js.map
