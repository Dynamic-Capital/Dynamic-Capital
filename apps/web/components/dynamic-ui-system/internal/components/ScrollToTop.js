"use client";
import { jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { Flex } from ".";
import styles from "./ScrollToTop.module.scss";
import classNames from "classnames";
export const ScrollToTop = ({ children, offset = 300, className, ...rest }) => {
  const [isVisible, setIsVisible] = useState(false);
  const handleScroll = () => {
    setIsVisible(window.scrollY > offset);
  };
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };
  useEffect(() => {
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);
  return (_jsx(Flex, {
    onClick: scrollToTop,
    "aria-hidden": !isVisible,
    position: "fixed",
    bottom: "16",
    right: "16",
    className: classNames(styles.scrollToTop, className),
    "data-visible": isVisible,
    tabIndex: isVisible ? 0 : -1,
    zIndex: isVisible ? 8 : 0,
    cursor: "pointer",
    ...rest,
    children: children,
  }));
};
//# sourceMappingURL=ScrollToTop.js.map
