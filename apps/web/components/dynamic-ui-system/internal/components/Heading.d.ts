import { ComponentPropsWithoutRef, ElementType } from "react";
import { CommonProps, SpacingProps, TextProps } from "../interfaces";
type HeadingProps<T extends ElementType> =
  & TextProps<T>
  & CommonProps
  & SpacingProps
  & ComponentPropsWithoutRef<T>;
declare const Heading: {
  <T extends ElementType = "h1">({
    as,
    variant,
    size,
    weight,
    onBackground,
    onSolid,
    align,
    wrap,
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
    children,
    style,
    truncate,
    className,
    ...props
  }: HeadingProps<T>): import("react/jsx-runtime").JSX.Element;
  displayName: string;
};
export { Heading };
//# sourceMappingURL=Heading.d.ts.map
