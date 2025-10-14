import { jsx as _jsx } from "react/jsx-runtime";
import classNames from "classnames";
import { forwardRef } from "react";
const ServerFlex = forwardRef(({
  as: Component = "div",
  inline,
  hide,
  dark,
  light,
  direction,
  xl,
  l,
  m,
  s,
  xs,
  wrap = false,
  horizontal,
  vertical,
  flex,
  textVariant,
  textSize,
  textWeight,
  textType,
  onBackground,
  onSolid,
  align,
  top,
  right,
  bottom,
  left,
  padding,
  paddingLeft,
  paddingRight,
  paddingTop,
  paddingBottom,
  paddingX,
  paddingY,
  margin,
  marginLeft,
  marginRight,
  marginTop,
  marginBottom,
  marginX,
  marginY,
  gap,
  position = "relative",
  center,
  width,
  height,
  maxWidth,
  minWidth,
  minHeight,
  maxHeight,
  fit = false,
  fitWidth = false,
  fitHeight = false,
  fill = false,
  fillWidth = false,
  fillHeight = false,
  aspectRatio,
  transition,
  background,
  solid,
  opacity,
  pointerEvents,
  border,
  borderTop,
  borderRight,
  borderBottom,
  borderLeft,
  borderX,
  borderY,
  borderStyle,
  borderWidth,
  radius,
  topRadius,
  rightRadius,
  bottomRadius,
  leftRadius,
  topLeftRadius,
  topRightRadius,
  bottomLeftRadius,
  bottomRightRadius,
  overflow,
  overflowX,
  overflowY,
  zIndex,
  shadow,
  cursor,
  className,
  style,
  children,
  ...rest
}, ref) => {
  if (onBackground && onSolid) {
    console.warn(
      "You cannot use both 'onBackground' and 'onSolid' props simultaneously. Only one will be applied.",
    );
  }
  if (background && solid) {
    console.warn(
      "You cannot use both 'background' and 'solid' props simultaneously. Only one will be applied.",
    );
  }
  const getVariantClasses = (variant) => {
    const [fontType, weight, size] = variant.split("-");
    return [`font-${fontType}`, `font-${weight}`, `font-${size}`];
  };
  const sizeClass = textSize ? `font-${textSize}` : "";
  const weightClass = textWeight ? `font-${textWeight}` : "";
  const variantClasses = textVariant
    ? getVariantClasses(textVariant)
    : [sizeClass, weightClass];
  let colorClass = "";
  if (onBackground) {
    const [scheme, weight] = onBackground.split("-");
    colorClass = `${scheme}-on-background-${weight}`;
  } else if (onSolid) {
    const [scheme, weight] = onSolid.split("-");
    colorClass = `${scheme}-on-solid-${weight}`;
  }
  const generateDynamicClass = (type, value) => {
    if (!value) {
      return undefined;
    }
    if (value === "transparent") {
      return `transparent-border`;
    }
    if (["surface", "page", "overlay"].includes(value)) {
      return `${value}-${type}`;
    }
    const parts = value.split("-");
    if (parts.includes("alpha")) {
      const [scheme, , weight] = parts;
      return `${scheme}-${type}-alpha-${weight}`;
    }
    const [scheme, weight] = value.split("-");
    return `${scheme}-${type}-${weight}`;
  };
  const classes = classNames(
    inline ? "display-inline-flex" : "display-flex",
    position && `position-${position}`,
    l?.position && `l-position-${l.position}`,
    m?.position && `m-position-${m.position}`,
    s?.position && `s-position-${s.position}`,
    hide && "flex-hide",
    l?.hide && "l-flex-hide",
    m?.hide && "m-flex-hide",
    s?.hide && "s-flex-hide",
    padding && `p-${padding}`,
    paddingLeft && `pl-${paddingLeft}`,
    paddingRight && `pr-${paddingRight}`,
    paddingTop && `pt-${paddingTop}`,
    paddingBottom && `pb-${paddingBottom}`,
    paddingX && `px-${paddingX}`,
    paddingY && `py-${paddingY}`,
    margin && `m-${margin}`,
    marginLeft && `ml-${marginLeft}`,
    marginRight && `mr-${marginRight}`,
    marginTop && `mt-${marginTop}`,
    marginBottom && `mb-${marginBottom}`,
    marginX && `mx-${marginX}`,
    marginY && `my-${marginY}`,
    gap === "-1"
      ? direction === "column" || direction === "column-reverse"
        ? "g-vertical--1"
        : "g-horizontal--1"
      : gap && `g-${gap}`,
    top ? `top-${top}` : position === "sticky" ? "top-0" : undefined,
    right && `right-${right}`,
    bottom && `bottom-${bottom}`,
    left && `left-${left}`,
    generateDynamicClass("background", background),
    generateDynamicClass("solid", solid),
    generateDynamicClass(
      "border",
      border || borderTop || borderRight || borderBottom || borderLeft ||
        borderX || borderY,
    ),
    (border || borderTop || borderRight || borderBottom || borderLeft ||
      borderX || borderY) &&
      !borderStyle &&
      "border-solid",
    border && !borderWidth && "border-1",
    (borderTop || borderRight || borderBottom || borderLeft || borderX ||
      borderY) &&
      "border-reset",
    borderTop && "border-top-1",
    borderRight && "border-right-1",
    borderBottom && "border-bottom-1",
    borderLeft && "border-left-1",
    borderX && "border-x-1",
    borderY && "border-y-1",
    borderWidth && `border-${borderWidth}`,
    borderStyle && `border-${borderStyle}`,
    radius === "full" ? "radius-full" : radius && `radius-${radius}`,
    topRadius && `radius-${topRadius}-top`,
    rightRadius && `radius-${rightRadius}-right`,
    bottomRadius && `radius-${bottomRadius}-bottom`,
    leftRadius && `radius-${leftRadius}-left`,
    topLeftRadius && `radius-${topLeftRadius}-top-left`,
    topRightRadius && `radius-${topRightRadius}-top-right`,
    bottomLeftRadius && `radius-${bottomLeftRadius}-bottom-left`,
    bottomRightRadius && `radius-${bottomRightRadius}-bottom-right`,
    direction && `flex-${direction}`,
    l?.direction && `l-flex-${l.direction}`,
    m?.direction && `m-flex-${m.direction}`,
    s?.direction && `s-flex-${s.direction}`,
    pointerEvents && `pointer-events-${pointerEvents}`,
    transition && `transition-${transition}`,
    opacity && `opacity-${opacity}`,
    wrap && "flex-wrap",
    overflow && `overflow-${overflow}`,
    overflowX && `overflow-x-${overflowX}`,
    overflowY && `overflow-y-${overflowY}`,
    flex && `flex-${flex}`,
    horizontal &&
      (direction === "row" || direction === "row-reverse" ||
          direction === undefined
        ? `justify-${horizontal}`
        : `align-${horizontal}`),
    vertical &&
      (direction === "row" || direction === "row-reverse" ||
          direction === undefined
        ? `align-${vertical}`
        : `justify-${vertical}`),
    l?.horizontal &&
      (l?.direction === "row" || l?.direction === "row-reverse" ||
          l?.direction === undefined
        ? `l-justify-${l.horizontal}`
        : `l-align-${l.horizontal}`),
    l?.vertical &&
      (l?.direction === "row" || l?.direction === "row-reverse" ||
          l?.direction === undefined
        ? `l-align-${l.vertical}`
        : `l-justify-${l.vertical}`),
    m?.horizontal &&
      (m?.direction === "row" || m?.direction === "row-reverse" ||
          m?.direction === undefined
        ? `m-justify-${m.horizontal}`
        : `m-align-${m.horizontal}`),
    m?.vertical &&
      (m?.direction === "row" || m?.direction === "row-reverse" ||
          m?.direction === undefined
        ? `m-align-${m.vertical}`
        : `m-justify-${m.vertical}`),
    s?.horizontal &&
      (s?.direction === "row" || s?.direction === "row-reverse" ||
          s?.direction === undefined
        ? `s-justify-${s.horizontal}`
        : `s-align-${s.horizontal}`),
    s?.vertical &&
      (s?.direction === "row" || s?.direction === "row-reverse" ||
          s?.direction === undefined
        ? `s-align-${s.vertical}`
        : `s-justify-${s.vertical}`),
    center && "center",
    fit && "fit",
    fitWidth && "fit-width",
    fitHeight && "fit-height",
    fill && "fill",
    fillWidth && !minWidth && "min-width-0",
    fillHeight && !minHeight && "min-height-0",
    fill && "min-height-0",
    fill && "min-width-0",
    (fillWidth || maxWidth) && "fill-width",
    (fillHeight || maxHeight) && "fill-height",
    shadow && `shadow-${shadow}`,
    zIndex && `z-index-${zIndex}`,
    textType && `font-${textType}`,
    typeof cursor === "string" && `cursor-${cursor}`,
    dark && "dark-flex",
    light && "light-flex",
    colorClass,
    className,
    ...variantClasses,
  );
  const parseDimension = (value, type) => {
    if (value === undefined || value === null) {
      return undefined;
    }
    if (typeof value === "number") {
      return `${value}rem`;
    }
    if (typeof value !== "string") {
      return undefined;
    }
    const trimmed = value.trim();
    if (!trimmed) {
      return undefined;
    }
    if (
      [
        "0",
        "1",
        "2",
        "4",
        "8",
        "12",
        "16",
        "20",
        "24",
        "32",
        "40",
        "48",
        "56",
        "64",
        "80",
        "104",
        "128",
        "160",
      ].includes(trimmed)
    ) {
      return `var(--static-space-${trimmed})`;
    }
    if (["xs", "s", "m", "l", "xl"].includes(trimmed)) {
      return `var(--responsive-${type}-${trimmed})`;
    }
    if (
      [
        "auto",
        "min-content",
        "max-content",
        "fit-content",
        "fit-content(100%)",
      ].includes(trimmed)
    ) {
      return trimmed;
    }
    if (
      trimmed.startsWith("var(") ||
      trimmed.startsWith("calc(") ||
      trimmed.startsWith("min(") ||
      trimmed.startsWith("max(") ||
      trimmed.startsWith("clamp(")
    ) {
      return trimmed;
    }
    const lengthPattern = /^(?:-?\d*\.?\d+)(?:px|rem|em|vh|vw|vmin|vmax|%)$/;
    if (lengthPattern.test(trimmed)) {
      return trimmed;
    }
    return trimmed;
  };
  const clampToViewportWidth = (value) => {
    if (value === undefined || value === null) {
      return undefined;
    }
    if (typeof value === "number") {
      if (value === 0) {
        return 0;
      }
      return `min(100%, ${value}px)`;
    }
    if (typeof value !== "string") {
      return value;
    }
    const trimmed = value.trim();
    if (!trimmed) {
      return undefined;
    }
    if (trimmed === "0" || trimmed === "auto") {
      return trimmed;
    }
    if (
      trimmed === "min-content" ||
      trimmed === "max-content" ||
      trimmed.startsWith("fit-content")
    ) {
      return trimmed;
    }
    if (trimmed.startsWith("min(100%")) {
      return trimmed;
    }
    if (
      trimmed.startsWith("min(") ||
      trimmed.startsWith("max(") ||
      trimmed.startsWith("clamp(")
    ) {
      return trimmed;
    }
    return `min(100%, ${trimmed})`;
  };
  const parsedMinWidth = parseDimension(minWidth, "width");
  const fluidMinWidth = clampToViewportWidth(parsedMinWidth);
  const baseStyle = {
    maxWidth: parseDimension(maxWidth, "width"),
    minHeight: parseDimension(minHeight, "height"),
    maxHeight: parseDimension(maxHeight, "height"),
    width: parseDimension(width, "width"),
    height: parseDimension(height, "height"),
    aspectRatio: aspectRatio,
    textAlign: align,
    cursor: typeof cursor === "string" ? cursor : undefined,
  };
  const combinedStyle = {
    ...baseStyle,
    ...style,
  };
  const inlineMinWidth = style?.minWidth ?? combinedStyle.minWidth;
  const resolvedInlineMinWidth = inlineMinWidth !== undefined
    ? clampToViewportWidth(inlineMinWidth)
    : undefined;
  const resolvedMinWidth = resolvedInlineMinWidth !== undefined
    ? resolvedInlineMinWidth
    : fluidMinWidth;
  if (resolvedMinWidth !== undefined) {
    combinedStyle.minWidth = resolvedMinWidth;
  }
  const shouldApplyFlexBasis = resolvedMinWidth !== undefined &&
    combinedStyle.flexBasis === undefined &&
    style?.flexBasis === undefined &&
    style?.flex === undefined &&
    flex === undefined &&
    combinedStyle.width === undefined;
  if (shouldApplyFlexBasis) {
    combinedStyle.flexBasis = resolvedMinWidth;
  }
  return (_jsx(Component, {
    ref: ref,
    className: classes,
    style: combinedStyle,
    ...rest,
    children: children,
  }));
});
ServerFlex.displayName = "ServerFlex";
export { ServerFlex };
//# sourceMappingURL=ServerFlex.js.map
