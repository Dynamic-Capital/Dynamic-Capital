"use client";
import { jsx as _jsx } from "react/jsx-runtime";
import { forwardRef, useEffect, useState } from "react";
import classNames from "classnames";
import { Flex, Grid, Logo } from ".";
import styles from "./LogoCloud.module.scss";
const ANIMATION_DURATION = 5000;
const STAGGER_DELAY = 25;
const LogoCloud = forwardRef(
  (
    {
      logos,
      className,
      style,
      limit = 6,
      rotationInterval = ANIMATION_DURATION,
      ...rest
    },
    ref,
  ) => {
    const [visibleLogos, setVisibleLogos] = useState(() =>
      logos.slice(0, limit)
    );
    const [key, setKey] = useState(0);
    const shouldRotate = logos.length > limit;
    useEffect(() => {
      if (!shouldRotate) {
        setVisibleLogos(logos);
        return;
      }
      const interval = setInterval(() => {
        setVisibleLogos((currentLogos) => {
          const currentIndices = currentLogos.map((logo) =>
            logos.findIndex((l) => l === logo)
          );
          const nextIndices = currentIndices
            .map((index) => (index + 1) % logos.length)
            .sort((a, b) => a - b);
          const nextLogos = nextIndices.map((index) => logos[index]);
          setKey((k) => k + 1);
          return nextLogos;
        });
      }, rotationInterval + STAGGER_DELAY * limit);
      return () => clearInterval(interval);
    }, [logos, limit, rotationInterval, shouldRotate]);
    return (_jsx(Grid, {
      ref: ref,
      className: classNames(styles.container, className),
      style: style,
      ...rest,
      children: visibleLogos.map((
        logo,
        index,
      ) => (_jsx(Flex, {
        vertical: "center",
        horizontal: "center",
        paddingX: "24",
        paddingY: "20",
        radius: "l",
        children: _jsx(Logo, {
          className: shouldRotate ? styles.logo : styles.staticLogo,
          style: {
            ...logo.style,
            animationDelay: `${index * STAGGER_DELAY}ms`,
          },
          ...logo,
        }),
      }, `${key}-${index}`))),
    }));
  },
);
LogoCloud.displayName = "LogoCloud";
export { LogoCloud };
//# sourceMappingURL=LogoCloud.js.map
