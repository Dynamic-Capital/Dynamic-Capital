import { jsx as _jsx } from "react/jsx-runtime";
import classNames from "classnames";
import { forwardRef } from "react";
import {
  clampDimensionToViewport,
  parseDimensionValue,
} from "./dimensionUtils";
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
  const parsedMinWidth = parseDimensionValue(minWidth, "width");
  const fluidMinWidth = clampDimensionToViewport(parsedMinWidth);
  const baseStyle = {
    maxWidth: parseDimensionValue(maxWidth, "width"),
    minHeight: parseDimensionValue(minHeight, "height"),
    maxHeight: parseDimensionValue(maxHeight, "height"),
    width: parseDimensionValue(width, "width"),
    height: parseDimensionValue(height, "height"),
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
    ? clampDimensionToViewport(inlineMinWidth)
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
