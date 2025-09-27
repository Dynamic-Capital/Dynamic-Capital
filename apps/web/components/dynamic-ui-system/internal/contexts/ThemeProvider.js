"use client";
import { jsx as _jsx } from "react/jsx-runtime";
import { dev } from "../utils";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
const initialThemeState = {
  theme: "system",
  resolvedTheme: "dark",
  setTheme: () => null,
};
const defaultStyleOptions = {
  theme: "system",
  neutral: "gray",
  brand: "blue",
  accent: "indigo",
  solid: "contrast",
  solidStyle: "flat",
  border: "playful",
  surface: "filled",
  transition: "all",
  scaling: "100",
};
const initialStyleState = {
  ...defaultStyleOptions,
  setStyle: () => null,
};
const ThemeProviderContext = createContext(initialThemeState);
const StyleProviderContext = createContext(initialStyleState);
function getStoredStyleValues() {
  if (typeof window === "undefined") {
    return {};
  }
  try {
    const storedStyle = {};
    const styleKeys = [
      "neutral",
      "brand",
      "accent",
      "solid",
      "solid-style",
      "border",
      "surface",
      "transition",
      "scaling",
    ];
    styleKeys.forEach((key) => {
      const kebabKey = key;
      const camelKey = kebabKey.replace(
        /-([a-z])/g,
        (_, letter) => letter.toUpperCase(),
      );
      const value = localStorage.getItem(`data-${kebabKey}`);
      if (value) {
        if (camelKey === "border") {
          storedStyle[camelKey] = value;
        } else if (camelKey === "solidStyle") {
          storedStyle[camelKey] = value;
        } else if (camelKey === "transition") {
          storedStyle[camelKey] = value;
        } else if (camelKey === "scaling") {
          storedStyle[camelKey] = value;
        } else if (camelKey === "surface") {
          storedStyle[camelKey] = value;
        } else if (camelKey === "neutral") {
          storedStyle.neutral = value;
        } else if (camelKey === "brand") {
          storedStyle.brand = value;
        } else if (camelKey === "accent") {
          storedStyle.accent = value;
        } else if (camelKey === "solid") {
          storedStyle.solid = value;
        }
      }
    });
    return storedStyle;
  } catch (e) {
    dev.error("Error reading stored style values:", e);
    return {};
  }
}
const getInitialTheme = () => {
  if (typeof window === "undefined") {
    return "system";
  }
  const savedTheme = localStorage.getItem("data-theme");
  if (savedTheme && (savedTheme === "light" || savedTheme === "dark")) {
    return savedTheme;
  }
  const domTheme = document.documentElement.getAttribute("data-theme");
  if (domTheme === "dark" || domTheme === "light") {
    return "system";
  }
  return "system";
};
const getInitialResolvedTheme = () => {
  if (typeof window === "undefined") {
    return "dark";
  }
  const domTheme = document.documentElement.getAttribute("data-theme");
  return domTheme === "dark" || domTheme === "light" ? domTheme : "dark";
};
export function ThemeProvider(
  {
    children,
    theme: propTheme = "system",
    neutral,
    brand,
    accent,
    solid,
    solidStyle,
    border,
    surface,
    transition,
    scaling,
  },
) {
  // If propTheme is light/dark, use it directly (forced mode)
  // Otherwise, use the stored preference from localStorage/DOM
  const initialThemeValue = propTheme !== "system"
    ? propTheme
    : getInitialTheme();
  // For resolvedTheme, if propTheme is light/dark, use that directly
  // Otherwise, get from DOM
  const initialResolvedValue = propTheme !== "system"
    ? propTheme
    : getInitialResolvedTheme();
  const [theme, setTheme] = useState(initialThemeValue);
  const [resolvedTheme, setResolvedTheme] = useState(initialResolvedValue);
  const getResolvedTheme = useCallback((t) => {
    if (t === "system") {
      return typeof window !== "undefined" &&
          window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    }
    return t;
  }, []);
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    // Only listen for system theme changes if:
    // 1. Current theme is 'system' AND
    // 2. propTheme is 'system' (not forcing light/dark)
    if (theme === "system" && propTheme === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handleChange = () => {
        const newResolved = mediaQuery.matches ? "dark" : "light";
        document.documentElement.setAttribute("data-theme", newResolved);
        setResolvedTheme(newResolved);
        dev.log(`System theme changed to: ${newResolved}`);
      };
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }
  }, [theme, propTheme]);
  const setThemeAndSave = useCallback((newTheme) => {
    try {
      // If propTheme is light/dark, we always use that for the DOM (forced mode)
      const isForced = propTheme !== "system";
      const resolved = isForced
        ? propTheme
        : newTheme === "system"
        ? window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light"
        : newTheme;
      // Only update localStorage if not in forced mode
      if (!isForced) {
        if (newTheme === "system") {
          localStorage.removeItem("data-theme");
        } else {
          localStorage.setItem("data-theme", newTheme);
        }
      }
      // Always update React state
      setTheme(newTheme);
      setResolvedTheme(resolved);
      // Set the DOM attribute to the resolved theme
      document.documentElement.setAttribute("data-theme", resolved);
      dev.log(`Theme set to ${newTheme} (resolved: ${resolved})`);
    } catch (e) {
      dev.error("Error setting theme:", e);
    }
  }, [propTheme]);
  const storedValues = typeof window !== "undefined"
    ? getStoredStyleValues()
    : {};
  const directProps = {};
  if (neutral) {
    directProps.neutral = neutral;
  }
  if (brand) {
    directProps.brand = brand;
  }
  if (accent) {
    directProps.accent = accent;
  }
  if (solid) {
    directProps.solid = solid;
  }
  if (solidStyle) {
    directProps.solidStyle = solidStyle;
  }
  if (border) {
    directProps.border = border;
  }
  if (surface) {
    directProps.surface = surface;
  }
  if (transition) {
    directProps.transition = transition;
  }
  if (scaling) {
    directProps.scaling = scaling;
  }
  const [style, setStyleState] = useState({
    ...defaultStyleOptions,
    ...directProps,
    ...storedValues,
    theme: theme,
  });
  useEffect(() => {
    setStyleState((prevStyle) => ({
      ...prevStyle,
      theme: theme,
    }));
  }, [theme]);
  const themeValue = {
    theme,
    resolvedTheme,
    setTheme: setThemeAndSave,
  };
  const camelToKebab = (str) => {
    return str.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, "$1-$2").toLowerCase();
  };
  const styleValue = {
    ...style,
    setStyle: (newStyle) => {
      setStyleState((prevStyle) => ({
        ...prevStyle,
        ...newStyle,
      }));
      Object.entries(newStyle).forEach(([key, value]) => {
        if (value && key !== "setStyle") {
          const attrName = `data-${camelToKebab(key)}`;
          if (key === "theme") {
            if (value === "system") {
              localStorage.removeItem("data-theme");
              const resolvedValue =
                window.matchMedia("(prefers-color-scheme: dark)").matches
                  ? "dark"
                  : "light";
              document.documentElement.setAttribute(attrName, resolvedValue);
            } else {
              localStorage.setItem("data-theme", value.toString());
              document.documentElement.setAttribute(attrName, value.toString());
            }
          } else {
            document.documentElement.setAttribute(attrName, value.toString());
            localStorage.setItem(`data-${camelToKebab(key)}`, value.toString());
          }
        }
      });
    },
  };
  useEffect(() => {
    if (typeof window !== "undefined") {
      Object.entries(style).forEach(([key, value]) => {
        if (value && key !== "setStyle") {
          if (key === "theme") {
            // If propTheme is light/dark, always use that for the DOM (forced mode)
            if (propTheme !== "system") {
              document.documentElement.setAttribute(
                `data-${camelToKebab(key)}`,
                propTheme,
              );
            } else if (value === "system") {
              const resolvedValue =
                window.matchMedia("(prefers-color-scheme: dark)").matches
                  ? "dark"
                  : "light";
              document.documentElement.setAttribute(
                `data-${camelToKebab(key)}`,
                resolvedValue,
              );
            } else {
              document.documentElement.setAttribute(
                `data-${camelToKebab(key)}`,
                value.toString(),
              );
            }
          } else {
            document.documentElement.setAttribute(
              `data-${camelToKebab(key)}`,
              value.toString(),
            );
          }
        }
      });
    }
  }, [style, propTheme]);
  return (_jsx(ThemeProviderContext.Provider, {
    value: themeValue,
    children: _jsx(StyleProviderContext.Provider, {
      value: styleValue,
      children: children,
    }),
  }));
}
export const useTheme = () => {
  const context = useContext(ThemeProviderContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
export const useStyle = () => {
  const context = useContext(StyleProviderContext);
  if (context === undefined) {
    throw new Error("useStyle must be used within a ThemeProvider");
  }
  return context;
};
export { defaultStyleOptions };
//# sourceMappingURL=ThemeProvider.js.map
