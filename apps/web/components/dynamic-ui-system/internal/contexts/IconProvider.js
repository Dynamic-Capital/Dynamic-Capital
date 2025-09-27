"use client";
import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext } from "react";
import { iconLibrary as defaultIcons } from "../icons";
export const IconContext = createContext({
  icons: defaultIcons,
});
export const IconProvider = ({ icons, children }) => {
  const mergedIcons = { ...defaultIcons };
  if (icons) {
    Object.entries(icons).forEach(([key, icon]) => {
      if (icon !== undefined) {
        mergedIcons[key] = icon;
      }
    });
  }
  return _jsx(IconContext.Provider, {
    value: { icons: mergedIcons },
    children: children,
  });
};
export const useIcons = () => useContext(IconContext);
//# sourceMappingURL=IconProvider.js.map
