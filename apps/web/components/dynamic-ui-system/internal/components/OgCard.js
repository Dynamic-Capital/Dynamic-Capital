"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Card, Column, Media, Row, Skeleton, Text } from ".";
import { useOgData } from "../hooks/useFetchOg";
import { useMemo } from "react";
const formatDisplayUrl = (url) => {
  if (!url) {
    return "";
  }
  try {
    const urlObj = new URL(url);
    let domain = urlObj.hostname;
    domain = domain.replace(/^www\./, "");
    return domain;
  } catch (error) {
    let formattedUrl = url.replace(/^https?:\/\//, "");
    formattedUrl = formattedUrl.replace(/^www\./, "");
    formattedUrl = formattedUrl.split("/")[0];
    return formattedUrl;
  }
};
const getFaviconUrl = (url, proxyFn) => {
  if (!url) {
    return "";
  }
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname;
    const faviconSourceUrl =
      `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
    // Use the provided proxy function or return the favicon URL directly
    return proxyFn ? proxyFn(faviconSourceUrl) : faviconSourceUrl;
  } catch (error) {
    return "";
  }
};
const OgCard = (
  {
    url,
    ogData: providedOgData,
    direction = "column",
    sizes = "320px",
    size = "m",
    serviceConfig = {},
    title,
    description,
    favicon,
    image,
    cardUrl,
    ...card
  },
) => {
  const { ogData: fetchedOgData, loading } = useOgData(
    url || null,
    serviceConfig.fetchOgUrl,
    serviceConfig.proxyOgUrl,
  );
  const data = providedOgData || fetchedOgData;
  // Resolve content based on props
  const resolvedTitle = useMemo(() => {
    if (title === false) {
      return null;
    }
    if (typeof title === "string") {
      return title;
    }
    return data?.title;
  }, [title, data?.title]);
  const resolvedDescription = useMemo(() => {
    if (description === false) {
      return null;
    }
    if (typeof description === "string") {
      return description;
    }
    return data?.description;
  }, [description, data?.description]);
  const resolvedFavicon = useMemo(() => {
    if (favicon === false) {
      return null;
    }
    if (typeof favicon === "string") {
      return favicon;
    }
    return (data?.faviconUrl ||
      (data?.url
        ? getFaviconUrl(data.url, serviceConfig.proxyFaviconUrl)
        : ""));
  }, [favicon, data?.faviconUrl, data?.url, serviceConfig.proxyFaviconUrl]);
  const resolvedImage = useMemo(() => {
    if (image === false) {
      return null;
    }
    if (typeof image === "string") {
      return image;
    }
    return data?.image
      ? serviceConfig.proxyImageUrl
        ? serviceConfig.proxyImageUrl(data.image)
        : data.image
      : "";
  }, [image, data?.image, serviceConfig.proxyImageUrl]);
  const resolvedUrl = useMemo(() => {
    if (cardUrl === false) {
      return null;
    }
    if (typeof cardUrl === "string") {
      return cardUrl;
    }
    return data?.url;
  }, [cardUrl, data?.url]);
  // With our updated useOgData hook, images are already proxied through the API
  // We only need additional proxying if a custom proxyImageUrl function is provided
  const proxiedImageUrl = useMemo(() => {
    return resolvedImage || "";
  }, [resolvedImage]);
  if (!loading && (!data || (!resolvedImage && !resolvedTitle))) {
    return null;
  }
  return (_jsxs(Card, {
    href: resolvedUrl || undefined,
    direction: direction,
    fillWidth: true,
    vertical: direction === "row" || direction === "row-reverse"
      ? "center"
      : undefined,
    gap: "4",
    radius: "l",
    background: "surface",
    border: "neutral-alpha-medium",
    ...card,
    children: [
      resolvedImage !== null && (proxiedImageUrl || loading) && (_jsx(Media, {
        minWidth: direction === "row" || direction === "row-reverse"
          ? 16
          : undefined,
        maxWidth: direction === "row" || direction === "row-reverse"
          ? 24
          : undefined,
        loading: loading,
        radius: "l",
        sizes: sizes,
        aspectRatio: "16/9",
        border: "neutral-alpha-weak",
        src: proxiedImageUrl,
      })),
      _jsxs(Column, {
        fillWidth: true,
        paddingX: size === "s" ? "12" : size === "m" ? "20" : "32",
        paddingY: size === "s" ? "12" : size === "m" ? "16" : "24",
        gap: size === "s" || size === "m" ? "8" : "20",
        children: [
          resolvedFavicon !== null && (_jsxs(Row, {
            fillWidth: true,
            gap: "8",
            vertical: "center",
            children: [
              _jsx(Media, {
                aspectRatio: "1/1",
                sizes: "24px",
                src: resolvedFavicon,
                loading: loading,
                minWidth: "16",
                maxWidth: "16",
                fillWidth: false,
                radius: "xs",
                border: "neutral-alpha-weak",
              }),
              resolvedUrl &&
              (loading
                ? (_jsx(Skeleton, { shape: "line", width: "xs", height: "xs" }))
                : (_jsx(Text, {
                  variant: "label-default-s",
                  onBackground: "neutral-weak",
                  children: formatDisplayUrl(resolvedUrl),
                }))),
            ],
          })),
          _jsxs(Column, {
            fillWidth: true,
            gap: size === "s" ? "4" : size === "m" ? "8" : "12",
            children: [
              resolvedTitle !== null &&
              (loading
                ? (_jsx(Skeleton, { shape: "line", width: "s", height: "s" }))
                : (resolvedTitle && (_jsx(Text, {
                  variant: size === "s"
                    ? "label-default-s"
                    : size === "m"
                    ? "label-default-m"
                    : "label-default-l",
                  children: resolvedTitle,
                })))),
              resolvedDescription !== null &&
              (loading
                ? (_jsxs(Column, {
                  fillWidth: true,
                  paddingY: "8",
                  gap: "8",
                  children: [
                    _jsx(Skeleton, {
                      shape: "line",
                      width: "xl",
                      height: "xs",
                    }),
                    _jsx(Skeleton, { shape: "line", width: "l", height: "xs" }),
                  ],
                }))
                : resolvedDescription
                ? (_jsx(Text, {
                  variant: size === "s"
                    ? "label-default-s"
                    : size === "m"
                    ? "label-default-m"
                    : "label-default-l",
                  onBackground: "neutral-weak",
                  children: resolvedDescription,
                }))
                : null),
            ],
          }),
        ],
      }),
    ],
  }));
};
OgCard.displayName = "OgCard";
export { OgCard };
//# sourceMappingURL=OgCard.js.map
