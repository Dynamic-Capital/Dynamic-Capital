"use client";
import {
  Fragment as _Fragment,
  jsx as _jsx,
  jsxs as _jsxs,
} from "react/jsx-runtime";
import { useEffect } from "react";
import Link from "next/link";
import classNames from "classnames";
import { Column, ContextMenu, Flex, Icon, Line, Option } from ".";
import { useToast } from "../contexts";
const sizeMap = {
  xs: "20",
  s: "24",
  m: "32",
  l: "40",
  xl: "48",
};
const Logo = (
  {
    size = "m",
    href,
    icon,
    wordmark,
    className,
    style,
    dark,
    light,
    brand,
    ...props
  },
) => {
  useEffect(() => {
    if (!icon && !wordmark) {
      console.warn(
        "Both 'icon' and 'wordmark' props are set to false. The logo will not render any content.",
      );
    }
  }, [icon, wordmark]);
  const content = _jsxs(_Fragment, {
    children: [
      icon && (
        // @ts-ignore
        _jsx("img", {
          style: {
            height: `var(--static-space-${sizeMap[size]})`,
            width: "auto",
          },
          alt: "Trademark",
          src: icon,
        })
      ),
      wordmark && (
        // @ts-ignore
        _jsx("img", {
          style: {
            height: `var(--static-space-${sizeMap[size]})`,
            width: "auto",
          },
          alt: "Trademark",
          src: wordmark,
        })
      ),
    ],
  });
  const { addToast } = useToast();
  const copyIconToClipboard = async () => {
    if (!icon) {
      addToast({
        variant: "danger",
        message: "No icon available to copy",
      });
      return;
    }
    try {
      const response = await fetch(icon);
      const svgText = await response.text();
      await navigator.clipboard.writeText(svgText);
      addToast({
        variant: "success",
        message: "Icon copied to clipboard as SVG",
      });
    } catch (error) {
      addToast({
        variant: "danger",
        message: "Failed to copy icon to clipboard",
      });
      console.error("Error copying icon:", error);
    }
  };
  const copyWordmarkToClipboard = async () => {
    if (!wordmark) {
      addToast({
        variant: "danger",
        message: "No wordmark available to copy",
      });
      return;
    }
    try {
      const response = await fetch(wordmark);
      const svgText = await response.text();
      await navigator.clipboard.writeText(svgText);
      addToast({
        variant: "success",
        message: "Wordmark copied to clipboard as SVG",
      });
    } catch (error) {
      addToast({
        variant: "danger",
        message: "Failed to copy wordmark to clipboard",
      });
      console.error("Error copying wordmark:", error);
    }
  };
  const renderDropdownContent = () => {
    return (_jsxs(Column, {
      fillWidth: true,
      children: [
        _jsxs(Column, {
          fillWidth: true,
          padding: "4",
          gap: "4",
          children: [
            brand?.copy && icon &&
            (_jsx(Option, {
              value: "copy-icon",
              label: "Copy icon as SVG",
              hasPrefix: _jsx(Logo, {
                size: "xs",
                icon: icon,
                style: { opacity: 0.5 },
              }),
              onClick: copyIconToClipboard,
            })),
            brand?.copy && wordmark &&
            (_jsx(Option, {
              value: "copy-wordmark",
              label: "Copy wordmark as SVG",
              hasPrefix: _jsx(Icon, {
                size: "xs",
                onBackground: "neutral-weak",
                name: "wordmark",
              }),
              onClick: copyWordmarkToClipboard,
            })),
          ],
        }),
        brand?.url && (_jsxs(_Fragment, {
          children: [
            _jsx(Line, {}),
            _jsx(Column, {
              fillWidth: true,
              padding: "4",
              children: _jsx(Option, {
                value: "brand-guidelines",
                label: "Visit brand guidelines",
                hasPrefix: _jsx(Icon, {
                  size: "xs",
                  onBackground: "neutral-weak",
                  name: "arrowUpRight",
                }),
                href: brand.url,
              }),
            }),
          ],
        })),
      ],
    }));
  };
  const enableContext = brand &&
    ((brand.copy && (icon || wordmark)) || brand.url);
  const renderLogo = () => {
    if (href) {
      return (_jsx(Link, {
        className: classNames(
          "radius-l",
          "display-flex",
          "fit-height",
          dark ? "dark-flex" : "",
          light ? "light-flex" : "",
          className,
        ),
        style: style,
        href: href,
        "aria-label": "Trademark",
        ...props,
        children: content,
      }));
    } else {
      return (_jsx(Flex, {
        className: classNames(className),
        dark: dark,
        light: light,
        radius: "l",
        fitHeight: true,
        style: style,
        "aria-label": "Trademark",
        children: content,
      }));
    }
  };
  return enableContext
    ? (_jsx(ContextMenu, {
      dropdown: renderDropdownContent(),
      placement: "bottom-start",
      children: renderLogo(),
    }))
    : (renderLogo());
};
Logo.displayName = "Logo";
export { Logo };
//# sourceMappingURL=Logo.js.map
