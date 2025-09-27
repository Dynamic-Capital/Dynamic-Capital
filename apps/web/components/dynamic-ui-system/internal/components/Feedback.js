import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { forwardRef } from "react";
import { Column, Flex, Icon, IconButton, Text } from ".";
const variantIconMap = {
  info: "info",
  danger: "danger",
  warning: "warning",
  success: "check",
};
const Feedback = forwardRef(
  (
    {
      variant = "info",
      icon = true,
      title,
      description,
      showCloseButton = false,
      onClose,
      className,
      style,
      children,
      ...rest
    },
    ref,
  ) => {
    return (_jsxs(Flex, {
      fillWidth: true,
      radius: "l",
      ref: ref,
      border: `${variant}-medium`,
      background: `${variant}-medium`,
      vertical: "start",
      role: "alert",
      "aria-live": "assertive",
      className: className,
      style: style,
      ...rest,
      children: [
        icon &&
        (_jsx(Flex, {
          paddingY: "16",
          paddingLeft: "16",
          children: _jsx(Icon, {
            padding: "2",
            radius: "m",
            onBackground: `${variant}-medium`,
            name: variantIconMap[variant],
            "aria-hidden": "true",
          }),
        })),
        _jsxs(Column, {
          fillWidth: true,
          padding: "16",
          gap: "24",
          vertical: "center",
          children: [
            (title || description) && (_jsxs(Column, {
              fillWidth: true,
              gap: "4",
              children: [
                title && (_jsxs(Flex, {
                  fillWidth: true,
                  gap: "16",
                  children: [
                    _jsx(Flex, {
                      fillWidth: true,
                      paddingY: "4",
                      children: _jsx(Text, {
                        variant: "heading-strong-xs",
                        onBackground: `${variant}-medium`,
                        role: "heading",
                        "aria-level": 2,
                        children: title,
                      }),
                    }),
                    showCloseButton &&
                    (_jsx(IconButton, {
                      onClick: onClose,
                      icon: "close",
                      size: "m",
                      tooltip: "Hide",
                      tooltipPosition: "top",
                      variant: "ghost",
                      "aria-label": "Close alert",
                    })),
                  ],
                })),
                description &&
                (_jsx(Text, {
                  marginBottom: "2",
                  marginTop: "4",
                  variant: "body-default-s",
                  onBackground: `${variant}-strong`,
                  children: description,
                })),
              ],
            })),
            children,
          ],
        }),
      ],
    }));
  },
);
Feedback.displayName = "Feedback";
export { Feedback };
//# sourceMappingURL=Feedback.js.map
