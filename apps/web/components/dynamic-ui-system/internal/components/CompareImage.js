"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from "react";
import { Flex, IconButton, Media } from ".";
import styles from "./CompareImage.module.scss";
const renderContent = (content, clipPath) => {
  if (typeof content.src === "string") {
    return (_jsx(Media, {
      src: content.src,
      alt: content.alt || "",
      fill: true,
      position: "absolute",
      style: { clipPath },
    }));
  }
  return (_jsx(Flex, {
    fill: true,
    position: "absolute",
    style: { clipPath },
    children: content.src,
  }));
};
const CompareImage = ({ leftContent, rightContent, ...rest }) => {
  const [position, setPosition] = useState(50);
  const containerRef = useRef(null);
  const isDragging = useRef(false);
  const handleMouseDown = () => {
    isDragging.current = true;
  };
  const handleMouseUp = () => {
    isDragging.current = false;
  };
  const updatePosition = (clientX) => {
    if (!isDragging.current || !containerRef.current) {
      return;
    }
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const containerWidth = rect.width;
    // Calculate percentage (constrained between 0 and 100)
    const newPosition = Math.max(0, Math.min(100, (x / containerWidth) * 100));
    setPosition(newPosition);
  };
  const handleMouseMove = (e) => {
    updatePosition(e.clientX);
  };
  const handleTouchMove = (e) => {
    updatePosition(e.touches[0].clientX);
  };
  useEffect(() => {
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("touchmove", handleTouchMove);
    document.addEventListener("touchend", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleMouseUp);
    };
  }, []);
  return (_jsxs(Flex, {
    ref: containerRef,
    aspectRatio: "16/9",
    fillWidth: true,
    style: { touchAction: "none" },
    ...rest,
    children: [
      renderContent(leftContent, `inset(0 ${100 - position}% 0 0)`),
      renderContent(rightContent, `inset(0 0 0 ${position}%)`),
      _jsx(Flex, {
        position: "absolute",
        horizontal: "center",
        width: 3,
        className: styles.hitArea,
        top: "0",
        bottom: "0",
        style: {
          left: `${position}%`,
        },
        onMouseDown: handleMouseDown,
        onTouchStart: handleMouseDown,
        children: _jsx(Flex, {
          width: "1",
          fillHeight: true,
          background: "neutral-strong",
          zIndex: 2,
        }),
      }),
      _jsx(IconButton, {
        icon: "chevronsLeftRight",
        variant: "secondary",
        className: styles.dragIcon,
        style: {
          left: `${position}%`,
        },
        onMouseDown: handleMouseDown,
        onTouchStart: handleMouseDown,
      }),
    ],
  }));
};
CompareImage.displayName = "CompareImage";
export { CompareImage };
//# sourceMappingURL=CompareImage.js.map
