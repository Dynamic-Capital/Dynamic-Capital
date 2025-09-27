import { jsx as _jsx } from "react/jsx-runtime";
import { forwardRef } from "react";
import styles from "./Fade.module.scss";
import { Flex } from ".";
import classNames from "classnames";
const Fade = forwardRef(({
  to = "bottom",
  base = "page",
  pattern = {
    display: false,
    size: "4",
  },
  blur = 0.5,
  children,
  className,
  style,
  ...rest
}, ref) => {
  const getBaseVar = (base) => {
    if (base === "page") {
      return "var(--page-background)";
    }
    if (base === "surface") {
      return "var(--surface-background)";
    }
    if (base === "overlay") {
      return "var(--backdrop)";
    }
    if (base === "transparent") {
      return "var(--static-transparent)";
    }
    const [scheme, weight] = base.includes("alpha")
      ? base.split("-alpha-")
      : base.split("-");
    return base.includes("alpha")
      ? `var(--${scheme}-alpha-${weight})`
      : `var(--${scheme}-background-${weight})`;
  };
  return (_jsx(Flex, {
    ref: ref,
    fillWidth: true,
    style: {
      "--base-color": getBaseVar(base),
      "--gradient-direction": to === "top"
        ? "0deg"
        : to === "right"
        ? "90deg"
        : to === "bottom"
        ? "180deg"
        : "270deg",
      ...(pattern.display && {
        backgroundImage:
          `linear-gradient(var(--gradient-direction), var(--base-color), transparent), radial-gradient(transparent 1px, var(--base-color) 1px)`,
        backgroundSize:
          `100% 100%, var(--static-space-${pattern.size}) var(--static-space-${pattern.size})`,
        backdropFilter: `blur(${blur}rem)`,
      }),
      ...style,
    },
    className: classNames(styles.mask, className),
    ...rest,
    children: children,
  }));
});
Fade.displayName = "Fade";
export { Fade };
//# sourceMappingURL=Fade.js.map
