"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useEffect, useRef, useState } from "react";
import classNames from "classnames";
import { Fade, Flex, IconButton } from ".";
import styles from "./Scroller.module.scss";
const Scroller = (
  {
    children,
    direction = "row",
    fadeColor,
    radius,
    className,
    style,
    onItemClick,
    ...rest
  },
) => {
  const scrollerRef = useRef(null);
  const [showPrevButton, setShowPrevButton] = useState(false);
  const [showNextButton, setShowNextButton] = useState(false);
  // Function to check and update scroll buttons visibility
  const updateScrollButtonsVisibility = () => {
    const scroller = scrollerRef.current;
    if (scroller) {
      const scrollPosition = direction === "row"
        ? scroller.scrollLeft
        : scroller.scrollTop;
      const maxScrollPosition = direction === "row"
        ? scroller.scrollWidth - scroller.clientWidth
        : scroller.scrollHeight - scroller.clientHeight;
      // Check if content is scrollable
      const isScrollable = direction === "row"
        ? scroller.scrollWidth > scroller.clientWidth
        : scroller.scrollHeight > scroller.clientHeight;
      setShowPrevButton(isScrollable && scrollPosition > 0);
      setShowNextButton(isScrollable && scrollPosition < maxScrollPosition - 1);
    }
  };
  // Handle scroll events
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (scroller) {
      // Initial check
      updateScrollButtonsVisibility();
      // Add scroll event listener
      scroller.addEventListener("scroll", updateScrollButtonsVisibility);
      return () =>
        scroller.removeEventListener("scroll", updateScrollButtonsVisibility);
    }
  }, [direction]);
  // Re-check when children change
  useEffect(() => {
    // Use setTimeout to ensure DOM has updated
    const timer = setTimeout(() => {
      updateScrollButtonsVisibility();
    }, 100);
    return () => clearTimeout(timer);
  }, [children]);
  const handleScrollNext = () => {
    const scroller = scrollerRef.current;
    if (scroller) {
      const scrollAmount = direction === "row"
        ? scroller.clientWidth / 2
        : scroller.clientHeight / 2;
      scroller.scrollBy({
        [direction === "row" ? "left" : "top"]: scrollAmount,
        behavior: "smooth",
      });
    }
  };
  const handleScrollPrev = () => {
    const scroller = scrollerRef.current;
    if (scroller) {
      const scrollAmount = direction === "row"
        ? scroller.clientWidth / 2
        : scroller.clientHeight / 2;
      scroller.scrollBy({
        [direction === "row" ? "left" : "top"]: -scrollAmount,
        behavior: "smooth",
      });
    }
  };
  const wrappedChildren = React.Children.map(children, (child, index) => {
    if (React.isValidElement(child)) {
      const {
        onClick: childOnClick,
        onKeyDown: childOnKeyDown,
        ...otherProps
      } = child.props;
      return React.cloneElement(child, {
        ...otherProps,
        onClick: (e) => {
          childOnClick?.(e);
          onItemClick?.(index);
        },
        onKeyDown: (e) => {
          childOnKeyDown?.(e);
          if (e.key === "Enter" || e.key === " ") {
            childOnClick?.(e);
            onItemClick?.(index);
          }
        },
      });
    }
    return child;
  });
  return (_jsxs(Flex, {
    fillWidth: true,
    className: classNames(styles.container, className),
    style: style,
    ...rest,
    children: [
      showPrevButton && (_jsx(Fade, {
        base: fadeColor,
        position: "absolute",
        padding: "4",
        horizontal: direction === "column" ? "center" : undefined,
        vertical: direction === "column" ? "start" : "center",
        to: direction === "row" ? "right" : "bottom",
        width: direction === "row" ? 4 : undefined,
        height: direction === "column" ? 4 : undefined,
        fillHeight: direction === "row",
        fillWidth: direction === "column",
        left: direction === "row" ? "0" : undefined,
        top: direction === "column" ? "0" : undefined,
        zIndex: 1,
        children: _jsx(IconButton, {
          icon: direction === "row" ? "chevronLeft" : "chevronUp",
          onClick: handleScrollPrev,
          onKeyDown: (e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleScrollPrev();
            }
          },
          size: "s",
          variant: "secondary",
          "aria-label": "Scroll Previous",
        }),
      })),
      _jsx(Flex, {
        fillWidth: true,
        zIndex: 0,
        radius: radius,
        direction: direction,
        className: classNames(styles.scroller, styles[direction]),
        ref: scrollerRef,
        children: wrappedChildren,
      }),
      showNextButton && (_jsx(Fade, {
        base: fadeColor,
        padding: "4",
        position: "absolute",
        horizontal: direction === "column" ? "center" : "end",
        vertical: direction === "column" ? "end" : "center",
        to: direction === "row" ? "left" : "top",
        width: direction === "row" ? 4 : undefined,
        height: direction === "column" ? 4 : undefined,
        fillHeight: direction === "row",
        fillWidth: direction === "column",
        right: direction === "row" ? "0" : undefined,
        bottom: direction === "column" ? "0" : undefined,
        zIndex: 1,
        children: _jsx(IconButton, {
          icon: direction === "row" ? "chevronRight" : "chevronDown",
          onClick: handleScrollNext,
          onKeyDown: (e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleScrollNext();
            }
          },
          size: "s",
          variant: "secondary",
          "aria-label": "Scroll Next",
        }),
      })),
    ],
  }));
};
Scroller.displayName = "Scroller";
export { Scroller };
//# sourceMappingURL=Scroller.js.map
