"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { forwardRef } from "react";
import { Avatar, Flex } from ".";
import styles from "./AvatarGroup.module.scss";
import classNames from "classnames";
const AvatarGroup = forwardRef(
  (
    { avatars, size = "m", reverse = false, limit, className, style, ...rest },
    ref,
  ) => {
    const displayedAvatars = limit ? avatars.slice(0, limit) : avatars;
    const remainingCount = limit && avatars.length > limit
      ? avatars.length - limit
      : 0;
    return (_jsxs(Flex, {
      vertical: "center",
      ref: ref,
      className: classNames(styles.avatarGroup, className),
      style: style,
      zIndex: 0,
      ...rest,
      children: [
        displayedAvatars.map((
          avatarProps,
          index,
        ) => (_jsx(Avatar, {
          size: size,
          ...avatarProps,
          className: styles.avatar,
          style: {
            ...avatarProps.style,
            zIndex: reverse ? displayedAvatars.length - index : index + 1,
          },
        }, index))),
        remainingCount > 0 &&
        (_jsx(Avatar, {
          value: `+${remainingCount}`,
          className: styles.avatar,
          size: size,
          style: {
            ...style,
            zIndex: reverse ? -1 : displayedAvatars.length + 1,
          },
        })),
      ],
    }));
  },
);
AvatarGroup.displayName = "AvatarGroup";
export { AvatarGroup };
//# sourceMappingURL=AvatarGroup.js.map
