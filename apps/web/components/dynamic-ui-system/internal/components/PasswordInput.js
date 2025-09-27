"use client";
import { jsx as _jsx } from "react/jsx-runtime";
import { forwardRef, useState } from "react";
import { IconButton, Input } from ".";
export const PasswordInput = forwardRef((props, ref) => {
  const [showPassword, setShowPassword] = useState(false);
  return (_jsx(Input, {
    ...props,
    ref: ref,
    type: showPassword ? "text" : "password",
    hasSuffix: _jsx(IconButton, {
      onClick: () => {
        setShowPassword(!showPassword);
      },
      variant: "ghost",
      icon: showPassword ? "eyeOff" : "eye",
      size: "s",
      type: "button",
    }),
  }));
});
PasswordInput.displayName = "PasswordInput";
//# sourceMappingURL=PasswordInput.js.map
