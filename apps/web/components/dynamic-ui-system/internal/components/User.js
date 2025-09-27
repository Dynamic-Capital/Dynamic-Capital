"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { forwardRef } from "react";
import classNames from "classnames";
import { Avatar, Column, Flex, Skeleton, Tag, Text } from ".";
const User = forwardRef(
  (
    {
      name,
      children,
      subline,
      tagProps = {},
      loading = false,
      avatarProps = {},
      className,
    },
    ref,
  ) => {
    const { src, value, empty, ...restAvatarProps } = avatarProps;
    const isEmpty = empty || (!src && !value);
    return (_jsxs(Flex, {
      ref: ref,
      vertical: "center",
      gap: "8",
      className: classNames(className),
      children: [
        _jsx(Avatar, {
          size: "m",
          src: src,
          value: value,
          empty: isEmpty,
          loading: loading,
          ...restAvatarProps,
        }),
        children,
        name && (_jsxs(Column, {
          paddingLeft: "4",
          paddingRight: "12",
          children: [
            loading
              ? (_jsx(Flex, {
                minWidth: 6,
                paddingY: "4",
                children: _jsx(Skeleton, {
                  width: "xl",
                  height: "m",
                  shape: "line",
                  "aria-label": "Loading name",
                }),
              }))
              : (_jsxs(Flex, {
                gap: "8",
                vertical: "center",
                children: [
                  _jsx(Text, {
                    variant: "label-default-m",
                    onBackground: "neutral-strong",
                    children: name,
                  }),
                  tagProps.label &&
                  (_jsx(Tag, {
                    size: "s",
                    ...tagProps,
                    children: tagProps.label,
                  })),
                ],
              })),
            loading
              ? (_jsx(Flex, {
                paddingY: "2",
                children: _jsx(Skeleton, {
                  width: "l",
                  height: "xs",
                  shape: "line",
                  "aria-label": "Loading subline",
                }),
              }))
              : (_jsx(Text, {
                wrap: "nowrap",
                variant: "body-default-xs",
                onBackground: "neutral-weak",
                children: subline,
              })),
          ],
        })),
      ],
    }));
  },
);
User.displayName = "User";
export { User };
//# sourceMappingURL=User.js.map
