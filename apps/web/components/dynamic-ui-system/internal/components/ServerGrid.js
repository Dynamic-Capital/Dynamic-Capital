import { jsx as _jsx } from "react/jsx-runtime";
import { forwardRef } from "react";
import classNames from "classnames";
const ServerGrid = forwardRef(({
  as: Component = "div",
  inline,
  columns,
  gap,
  position = "relative",
  xl,
  l,
  m,
  s,
  xs,
  hide,
  aspectRatio,
  align,
  textVariant,
  textSize,
  textWeight,
  textType,
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
  dark,
  light,
  width,
  height,
  maxWidth,
  minWidth,
  minHeight,
  maxHeight,
  top,
  right,
  bottom,
  left,
  fit,
  fill,
  fillWidth = false,
  fillHeight = false,
  fitWidth,
  fitHeight,
  background,
  solid,
  opacity,
  transition,
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
  cursor,
  zIndex,
  shadow,
  className,
  style,
  children,
  ...rest
}, ref) => {
  const generateDynamicClass = (type, value) => {
    if (!value) {
      return undefined;
    }
    if (value === "transparent") {
      return `transparent-border`;
    }
    if (value === "surface" || value === "page" || value === "transparent") {
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
  const classes = classNames(
    position && `position-${position}`,
    l?.position && `l-position-${l.position}`,
    m?.position && `m-position-${m.position}`,
    s?.position && `s-position-${s.position}`,
    inline ? "display-inline-grid" : "display-grid",
    hide && "grid-hide",
    l?.hide && "l-grid-hide",
    m?.hide && "m-grid-hide",
    s?.hide && "s-grid-hide",
    fit && "fit",
    fitWidth && "fit-width",
    fitHeight && "fit-height",
    fill && "fill",
    (fillWidth || maxWidth) && "fill-width",
    (fillHeight || maxHeight) && "fill-height",
    columns && `columns-${columns}`,
    l?.columns && `l-columns-${l.columns}`,
    m?.columns && `m-columns-${m.columns}`,
    s?.columns && `s-columns-${s.columns}`,
    overflow && `overflow-${overflow}`,
    overflowX && `overflow-x-${overflowX}`,
    overflowY && `overflow-y-${overflowY}`,
    l?.overflow && `l-overflow-${l.overflow}`,
    m?.overflow && `m-overflow-${m.overflow}`,
    s?.overflow && `s-overflow-${s.overflow}`,
    l?.overflowX && `l-overflow-x-${l.overflowX}`,
    m?.overflowX && `m-overflow-x-${m.overflowX}`,
    s?.overflowX && `s-overflow-x-${s.overflowX}`,
    l?.overflowY && `l-overflow-y-${l.overflowY}`,
    m?.overflowY && `m-overflow-y-${m.overflowY}`,
    s?.overflowY && `s-overflow-y-${s.overflowY}`,
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
    gap && `g-${gap}`,
    top && `top-${top}`,
    l?.top && `l-top-${l.top}`,
    m?.top && `m-top-${m.top}`,
    s?.top && `s-top-${s.top}`,
    right && `right-${right}`,
    l?.right && `l-right-${l.right}`,
    m?.right && `m-right-${m.right}`,
    s?.right && `s-right-${s.right}`,
    bottom && `bottom-${bottom}`,
    l?.bottom && `l-bottom-${l.bottom}`,
    m?.bottom && `m-bottom-${m.bottom}`,
    s?.bottom && `s-bottom-${s.bottom}`,
    left && `left-${left}`,
    l?.left && `l-left-${l.left}`,
    m?.left && `m-left-${m.left}`,
    s?.left && `s-left-${s.left}`,
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
    border && !borderWidth && `border-1`,
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
    pointerEvents && `pointer-events-${pointerEvents}`,
    transition && `transition-${transition}`,
    shadow && `shadow-${shadow}`,
    zIndex && `z-index-${zIndex}`,
    textType && `font-${textType}`,
    typeof cursor === "string" && `cursor-${cursor}`,
    dark && "dark-grid",
    light && "light-grid",
    className,
  );
  const combinedStyle = {
    maxWidth: parseDimension(maxWidth, "width"),
    minHeight: parseDimension(minHeight, "height"),
    maxHeight: parseDimension(maxHeight, "height"),
    width: parseDimension(width, "width"),
    height: parseDimension(height, "height"),
    aspectRatio: aspectRatio,
    textAlign: align,
    // Hide default cursor when using custom cursor
    cursor: typeof cursor === "string" ? cursor : undefined,
    ...style,
  };
  const parsedMinWidth = parseDimension(minWidth, "width");
  const inlineMinWidth = style?.minWidth ?? combinedStyle.minWidth;
  const resolvedInlineMinWidth = inlineMinWidth !== undefined
    ? clampToViewportWidth(inlineMinWidth)
    : undefined;
  const resolvedMinWidth = resolvedInlineMinWidth !== undefined
    ? resolvedInlineMinWidth
    : clampToViewportWidth(parsedMinWidth);
  if (resolvedMinWidth !== undefined) {
    combinedStyle.minWidth = resolvedMinWidth;
  }
  return (_jsx(Component, {
    ref: ref,
    className: classes,
    style: combinedStyle,
    ...rest,
    children: children,
  }));
});
ServerGrid.displayName = "ServerGrid";
export { ServerGrid };
//# sourceMappingURL=ServerGrid.js.map
