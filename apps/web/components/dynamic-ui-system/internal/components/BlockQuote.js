import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { forwardRef } from "react";
import { Avatar, Column, Line, Row, SmartLink, Text } from ".";
const BlockQuote = forwardRef(
  (
    {
      children,
      className,
      style,
      preline,
      subline,
      author,
      link,
      align = "center",
      separator = "both",
      ...flex
    },
    ref,
  ) => {
    return (_jsxs(Column, {
      fillWidth: true,
      horizontal: "center",
      gap: "24",
      children: [
        (separator === "top" || separator === "both") &&
        (_jsx(Row, {
          fillWidth: true,
          horizontal: "center",
          children: _jsx(Line, { width: "40" }),
        })),
        _jsxs(Column, {
          ref: ref,
          as: "blockquote",
          fillWidth: true,
          marginY: "32",
          marginX: "0",
          horizontal: align === "left"
            ? "start"
            : align === "right"
            ? "end"
            : "center",
          align: align,
          style: style,
          className: className,
          ...flex,
          children: [
            preline &&
            (_jsx(Text, {
              onBackground: "neutral-weak",
              marginBottom: "32",
              children: preline,
            })),
            _jsx(Text, {
              variant: "heading-strong-xl",
              wrap: "balance",
              children: children,
            }),
            subline &&
            (_jsx(Text, {
              onBackground: "neutral-weak",
              marginTop: "24",
              children: subline,
            })),
            (author || link) && (_jsxs(Row, {
              gap: "12",
              center: true,
              marginTop: "32",
              children: [
                "\u2014",
                author?.avatar &&
                (_jsx(Avatar, { size: "s", src: author?.avatar })),
                author?.name &&
                (_jsx(Text, {
                  variant: "label-default-s",
                  children: author?.name,
                })),
                link?.href && (_jsx(Row, {
                  as: "cite",
                  children: _jsx(SmartLink, {
                    unstyled: true,
                    href: link?.href &&
                      (/^https?:\/\//.test(link.href)
                        ? link.href
                        : `https://${link.href}`),
                    children: _jsx(Text, {
                      variant: "label-default-s",
                      children: link?.label || link?.href,
                    }),
                  }),
                })),
              ],
            })),
          ],
        }),
        (separator === "bottom" || separator === "both") &&
        (_jsx(Row, {
          fillWidth: true,
          horizontal: "center",
          children: _jsx(Line, { width: "40" }),
        })),
      ],
    }));
  },
);
BlockQuote.displayName = "BlockQuote";
export { BlockQuote };
//# sourceMappingURL=BlockQuote.js.map
