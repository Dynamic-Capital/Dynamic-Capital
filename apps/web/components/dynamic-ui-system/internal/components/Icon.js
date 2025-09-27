"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { forwardRef, useEffect, useState } from "react";
import classNames from "classnames";
import { useIcons } from "../contexts/IconProvider";
import { Flex, Tooltip } from ".";
import styles from "./Icon.module.scss";
import iconStyles from "./IconButton.module.scss";
const Icon = forwardRef(
  (
    {
      name,
      onBackground,
      onSolid,
      size = "m",
      decorative = true,
      tooltip,
      tooltipPosition = "top",
      className,
      style,
      ...rest
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
    const { icons } = useIcons();
    const IconComponent = icons[name];
    if (!IconComponent) {
      console.warn(`Icon "${name}" does not exist in the library.`);
      return null;
    }
    if (onBackground && onSolid) {
      console.warn(
        "You cannot use both 'onBackground' and 'onSolid' props simultaneously. Only one will be applied.",
      );
    }
    let colorClass = "color-inherit";
    if (onBackground) {
      const [scheme, weight] = onBackground.split("-");
      colorClass = `${scheme}-on-background-${weight}`;
    } else if (onSolid) {
      const [scheme, weight] = onSolid.split("-");
      colorClass = `${scheme}-on-solid-${weight}`;
    }
    return (_jsxs(Flex, {
      inline: true,
      fit: true,
      as: "span",
      ref: ref,
      className: classNames(colorClass, styles.icon, styles[size], className),
      "aria-hidden": decorative ? "true" : undefined,
      "aria-label": decorative ? undefined : name,
      onMouseEnter: () => setIsHover(true),
      onMouseLeave: () => setIsHover(false),
      style: style,
      ...rest,
      children: [
        _jsx(IconComponent, {}),
        tooltip && isTooltipVisible &&
        (_jsx(Flex, {
          position: "absolute",
          zIndex: 1,
          className: iconStyles[tooltipPosition],
          children: _jsx(Tooltip, { label: tooltip }),
        })),
      ],
    }));
  },
);
Icon.displayName = "Icon";
export { Icon };
//# sourceMappingURL=Icon.js.map
