"use client";
import {
  Fragment as _Fragment,
  jsx as _jsx,
  jsxs as _jsxs,
} from "react/jsx-runtime";
import { useEffect, useRef, useState } from "react";
import { Column, Flex, Row, Skeleton } from ".";
import Image from "next/image";
import classNames from "classnames";
const Media = ({
  src,
  alt = "",
  fillWidth = true,
  fill = false,
  loading = false,
  enlarge = false,
  unoptimized = false,
  objectFit = "cover",
  sizes = "100vw",
  aspectRatio = "original",
  height,
  priority,
  caption,
  style,
  className,
  ...rest
}) => {
  const [isEnlarged, setIsEnlarged] = useState(false);
  const imageRef = useRef(null);
  const handleImageClick = () => {
    if (enlarge && !isEnlarged) {
      setIsEnlarged(true);
    }
  };
  const handleOverlayClick = () => {
    if (isEnlarged) {
      setIsEnlarged(false);
    }
  };
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === "Escape" && isEnlarged) {
        setIsEnlarged(false);
      }
    };
    const handleWheel = (event) => {
      if (isEnlarged) {
        setIsEnlarged(false);
      }
    };
    document.addEventListener("keydown", handleEscape);
    window.addEventListener("wheel", handleWheel, { passive: true });
    return () => {
      document.removeEventListener("keydown", handleEscape);
      window.removeEventListener("wheel", handleWheel);
    };
  }, [isEnlarged]);
  useEffect(() => {
    if (isEnlarged) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isEnlarged]);
  const calculateTransform = () => {
    if (!imageRef.current) {
      return {};
    }
    const rect = imageRef.current.getBoundingClientRect();
    const scaleX = window.innerWidth / rect.width;
    const scaleY = window.innerHeight / rect.height;
    const scale = Math.min(scaleX, scaleY) * 0.9;
    const translateX = (window.innerWidth - rect.width) / 2 - rect.left;
    const translateY = (window.innerHeight - rect.height) / 2 - rect.top;
    return {
      transform: isEnlarged
        ? `translate(${translateX}px, ${translateY}px) scale(${scale})`
        : "translate(0, 0) scale(1)",
      transition: "all 0.3s ease-in-out",
      zIndex: isEnlarged ? 10 : undefined,
    };
  };
  const isYouTubeVideo = (url) => {
    const youtubeRegex =
      /(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    return youtubeRegex.test(url);
  };
  const getYouTubeEmbedUrl = (url) => {
    const match = url.match(
      /(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    );
    return match
      ? `https://www.youtube.com/embed/${
        match[1]
      }?controls=0&rel=0&modestbranding=1`
      : "";
  };
  const isVideo = src?.endsWith(".mp4");
  const isYouTube = isYouTubeVideo(src);
  return (_jsxs(_Fragment, {
    children: [
      isEnlarged && enlarge && typeof document !== "undefined" && (_jsx(Flex, {
        center: true,
        position: "fixed",
        background: "overlay",
        pointerEvents: "auto",
        onClick: handleOverlayClick,
        top: "0",
        left: "0",
        zIndex: 9,
        opacity: 100,
        cursor: "interactive",
        transition: "macro-medium",
        className: "cursor-interactive",
        style: {
          backdropFilter: "blur(0.5rem)",
          width: "100vw",
          height: "100vh",
        },
      })),
      _jsxs(_Fragment, {
        children: [
          _jsxs(Column, {
            as: caption ? "figure" : undefined,
            ref: imageRef,
            fillWidth: true,
            overflow: "hidden",
            zIndex: 0,
            margin: "0",
            cursor: enlarge ? "interactive" : undefined,
            style: {
              outline: "none",
              isolation: "isolate",
              height: aspectRatio === "original"
                ? undefined
                : aspectRatio
                ? ""
                : height
                ? `${height}rem`
                : "100%",
              aspectRatio: aspectRatio === "original" ? undefined : aspectRatio,
              borderRadius: isEnlarged ? "0" : undefined,
              ...calculateTransform(),
              ...style,
            },
            onClick: handleImageClick,
            className: classNames(
              enlarge && !isEnlarged ? "cursor-interactive" : undefined,
              className,
            ),
            ...rest,
            children: [
              loading &&
              _jsx(Skeleton, { shape: "block", radius: rest.radius }),
              !loading && isVideo &&
              (_jsx("video", {
                src: src,
                autoPlay: true,
                loop: true,
                muted: true,
                playsInline: true,
                style: {
                  width: "100%",
                  height: "100%",
                  objectFit: objectFit,
                },
              })),
              !loading && isYouTube && (_jsx("iframe", {
                width: "100%",
                height: "100%",
                src: getYouTubeEmbedUrl(src),
                frameBorder: "0",
                allow:
                  "accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture",
                allowFullScreen: true,
                style: {
                  objectFit: objectFit,
                },
              })),
              !loading && !isVideo && !isYouTube &&
              (_jsx(Image, {
                src: src,
                alt: alt,
                sizes: sizes,
                priority: priority,
                unoptimized: unoptimized,
                fill: fill || !aspectRatio,
                width: fill ? undefined : 0,
                height: fill ? undefined : 0,
                style: {
                  objectFit: objectFit,
                  aspectRatio: fill ? undefined : aspectRatio,
                  width: aspectRatio ? "100%" : undefined,
                  height: aspectRatio ? "100%" : undefined,
                },
              })),
            ],
          }),
          caption && (_jsx(Row, {
            as: "figcaption",
            fillWidth: true,
            textVariant: "label-default-s",
            onBackground: "neutral-weak",
            paddingY: "12",
            paddingX: "24",
            horizontal: "center",
            align: "center",
            children: caption,
          })),
        ],
      }),
    ],
  }));
};
Media.displayName = "Media";
export { Media };
//# sourceMappingURL=Media.js.map
