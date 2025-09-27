"use client";
import {
  Fragment as _Fragment,
  jsx as _jsx,
  jsxs as _jsxs,
} from "react/jsx-runtime";
import { forwardRef, useEffect, useState } from "react";
import { ElementType } from "./ElementType";
import { Flex, Icon, Tooltip } from ".";
import buttonStyles from "./Button.module.scss";
import iconStyles from "./IconButton.module.scss";
import classNames from "classnames";
const IconButton = forwardRef(
  (
    {
      icon = "refresh",
      size = "m",
      id,
      radius,
      tooltip,
      tooltipPosition = "top",
      variant = "primary",
      href,
      children,
      className,
      style,
      ...props
    },
    ref,
  ) => {
    const [isTooltipVisible, setTooltipVisible] = useState(false);
    const [isHover, setIsHover] = useState(false);
    useEffect(() => {
      let timer;
      if (isHover) {
        timer = setTimeout(() => {
          setTooltipVisible(true);
        }, 400);
      } else {
        setTooltipVisible(false);
      }
      return () => clearTimeout(timer);
    }, [isHover]);
    const content = _jsxs(_Fragment, {
      children: [
        children ? children : _jsx(Icon, { name: icon, size: "s" }),
        tooltip && isTooltipVisible &&
        (_jsx(Flex, {
          position: "absolute",
          zIndex: 1,
          className: iconStyles[tooltipPosition],
          children: _jsx(Tooltip, { label: tooltip }),
        })),
      ],
    });
    const radiusSize = size === "s" || size === "m" ? "m" : "l";
    return (_jsx(ElementType, {
      id: id,
      href: href,
      ref: ref,
      className: classNames(
        buttonStyles.button,
        buttonStyles[variant],
        iconStyles[size],
        className,
        radius === "none"
          ? "radius-none"
          : radius
          ? `radius-${radiusSize}-${radius}`
          : `radius-${radiusSize}`,
        "text-decoration-none",
        "button",
        "cursor-interactive",
        className,
      ),
      style: style,
      onMouseEnter: () => setIsHover(true),
      onMouseLeave: () => setIsHover(false),
      "aria-label": tooltip || icon,
      ...props,
      children: _jsx(Flex, { fill: true, center: true, children: content }),
    }));
  },
);
IconButton.displayName = "IconButton";
export { IconButton };
//# sourceMappingURL=IconButton.js.map
