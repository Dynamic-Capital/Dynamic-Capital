import { ComponentPropsWithoutRef, ElementRef, ElementType, Ref } from "react";
import { CommonProps, SpacingProps, TextProps } from "../interfaces";
type TypeProps<T extends ElementType> =
  & TextProps<T>
  & CommonProps
  & SpacingProps
  & ComponentPropsWithoutRef<T>;
type TextComponent =
  & (<T extends ElementType = "span">({
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
    className,
    truncate,
    ...props
  }: TypeProps<T> & {
    ref?: Ref<ElementRef<T>>;
  }) => import("react/jsx-runtime").JSX.Element)
  & {
    displayName: string;
  };
declare const Text: TextComponent;
export { Text };
//# sourceMappingURL=Text.d.ts.map
