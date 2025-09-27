"use client";
import {
  Fragment as _Fragment,
  jsx as _jsx,
  jsxs as _jsxs,
} from "react/jsx-runtime";
import { forwardRef } from "react";
import classNames from "classnames";
import { ElementType, Icon } from ".";
const SmartLink = forwardRef(
  (
    {
      href,
      prefixIcon,
      suffixIcon,
      fillWidth = false,
      iconSize = "xs",
      style,
      className,
      selected,
      unstyled = false,
      children,
      ...props
    },
    ref,
  ) => {
    const content = _jsxs(_Fragment, {
      children: [
        prefixIcon && _jsx(Icon, { name: prefixIcon, size: iconSize }),
        children,
        suffixIcon && _jsx(Icon, { name: suffixIcon, size: iconSize }),
      ],
    });
    const commonProps = {
      ref,
      className: classNames(
        className,
        "reset-button-styles focus-ring align-center display-inline-flex g-8 radius-s",
        {
          "fill-width": fillWidth,
          "fit-width": !fillWidth,
          "min-width-0": fillWidth,
          "px-2 mx-2": !unstyled,
        },
      ),
      style: !unstyled
        ? {
          ...(selected && {
            textDecoration: "underline",
            textUnderlineOffset: "0.3em",
            textUnderlineThickness: "var(--static-space-1)",
            color: "var(--neutral-on-background-strong)",
          }),
          ...style,
        }
        : {
          textDecoration: "none",
          ...style,
        },
      ...props,
    };
    return (_jsx(ElementType, {
      href: href,
      ...commonProps,
      children: content,
    }));
  },
);
SmartLink.displayName = "SmartLink";
export { SmartLink };
//# sourceMappingURL=SmartLink.js.map
